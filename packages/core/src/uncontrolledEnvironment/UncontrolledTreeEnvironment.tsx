import * as React from 'react';
import {
  ControlledTreeEnvironmentProps,
  ImplicitDataSource, IndividualTreeViewState,
  TreeConfiguration, TreeDataProvider, TreeEnvironmentContextProps, TreeItem, TreeItemIndex, TreeViewState,
  UncontrolledTreeEnvironmentProps,
} from '../types';
import { useEffect, useMemo, useState } from 'react';
import { ControlledTreeEnvironment } from '../controlledEnvironment/ControlledTreeEnvironment';
import { CompleteTreeDataProvider } from './CompleteTreeDataProvider';

/*const createCompleteDataProvider = (provider: TreeDataProvider): CompleteTreeDataProvider => ({ // TODO Write class that internally uses provider instead
  ...provider,
  getTreeItem: provider.getTreeItem,
  onDidChangeTreeData: provider.onDidChangeTreeData?.bind(provider) ?? (() => ({ dispose: () => {} })),
  getTreeItems: provider.getTreeItems?.bind(provider) ?? (itemIds => Promise.all(itemIds.map(id => provider.getTreeItem(id)))),
  onRenameItem: provider.onRenameItem?.bind(provider) ?? (async () => {}),
  onChangeItemChildren: provider.onChangeItemChildren?.bind(provider) ?? (async () => {}),
});*/

export const UncontrolledTreeEnvironment = React.forwardRef<TreeEnvironmentContextProps, UncontrolledTreeEnvironmentProps>((props, ref) => {
  const [currentItems, setCurrentItems] = useState<Record<TreeItemIndex, TreeItem>>({});
  const [viewState, setViewState] = useState(props.viewState);
  const dataProvider = useMemo(() => new CompleteTreeDataProvider(props.dataProvider), [props.dataProvider]);

  const writeItems = useMemo(() => (newItems: Record<TreeItemIndex, TreeItem>) => {
    setCurrentItems(oldItems => ({ ...oldItems, ...newItems }));
  }, []);

  const amendViewState = (treeId: string, constructNewState: (oldState: IndividualTreeViewState) => Partial<IndividualTreeViewState>) => {
    setViewState(oldState => ({
      ...oldState,
      [treeId]: {
        ...oldState[treeId],
        ...constructNewState(oldState[treeId] ?? {}),
      }
    }));
  }

  useEffect(() => {
    const { dispose } = dataProvider.onDidChangeTreeData(changedItemIds => {
      dataProvider.getTreeItems(changedItemIds).then(items => {
        writeItems(items.map(item => ({ [item.index]: item })).reduce((a, b) => ({...a, ...b}), {}));
      });
    });

    return dispose;
  })

  return (
    <ControlledTreeEnvironment
      {...props}
      ref={ref}
      viewState={viewState}
      items={currentItems}
      onExpandItem={(item, treeId) => {
        amendViewState(treeId, old => ({ ...old, expandedItems: [...old.expandedItems ?? [], item.index] }));
        //const itemsToLoad = item.children?.filter(itemId => currentItems[itemId] === undefined) ?? [];
        //dataProvider.getTreeItems(itemsToLoad).then(items => {
        //  writeItems(items.map(item => ({ [item.index]: item })).reduce((a, b) => ({...a, ...b}), {}));
        //  setViewState(viewState => ({ ...viewState, expandedItems: [...viewState.expandedItems ?? [], item.index] }));
        //});
      }}
      onCollapseItem={(item, treeId) => {
        amendViewState(treeId, old => ({ ...old, expandedItems: old.expandedItems?.filter(id => id !== item.index) }));
      }}
      onSelectItems={(items, treeId) => {
        amendViewState(treeId, old => ({ ...old, selectedItems: items }));
      }}
      onFocusItem={(item, treeId) => {
        amendViewState(treeId, old => ({ ...old, focusedItem: item.index }));
      }}
      onStartRenamingItem={(item, treeId) => {
        amendViewState(treeId, old => ({ ...old, renamingItem: item.index }));
      }}
      onRenameItem={async (item, name, treeId) => {
        console.log(item, name)
        await dataProvider.onRenameItem(item, name);
        console.log(dataProvider, dataProvider.getTreeItem)
        amendViewState(treeId, old => ({ ...old, renamingItem: undefined }));
        const newItem = await dataProvider.getTreeItem(item.index);
        console.log(newItem)
        writeItems({ [item.index]: newItem });
      }}
      onDrop={async (items, target) => {
        for (const item of items) {
          const parent = Object.values(currentItems).find(potentialParent => potentialParent.children?.includes(item.index));
          const newParent = currentItems[target.parentItem];

          if (!parent) {
            throw Error(`Could not find parent of item "${item.index}"`);
          }

          if (!parent.children) {
            throw Error(`Parent "${parent.index}" of item "${item.index}" did not have any children`);
          }

          if (target.targetType === 'item') {
            if (target.targetItem === parent.index) {
              // NOOP
            } else {
              await dataProvider.onChangeItemChildren(parent.index, parent.children.filter(child => child !== item.index));
              await dataProvider.onChangeItemChildren(target.targetItem, [...currentItems[target.targetItem].children ?? [], item.index]);
            }
          } else {
            const newParentChildren = [...newParent.children ?? []].filter(child => child !== item.index);

            if (target.parentItem === parent.index) {
              const isOldItemPriorToNewItem = ((newParent.children ?? []).findIndex(child => child === item.index) ?? Infinity) < target.childIndex;
              newParentChildren.splice(target.childIndex - (isOldItemPriorToNewItem ? 1 : 0), 0, item.index);
              await dataProvider.onChangeItemChildren(target.parentItem, newParentChildren);
            } else {
              newParentChildren.splice(target.childIndex, 0, item.index);
              await dataProvider.onChangeItemChildren(parent.index, parent.children.filter(child => child !== item.index));
              await dataProvider.onChangeItemChildren(target.parentItem, newParentChildren);
            }
          }

        }
      }}
      onMissingItems={itemIds => {
        console.log(`Retrieving items ${itemIds.join(', ')}`)
        dataProvider.getTreeItems(itemIds).then(items => {
          writeItems(items.map(item => ({ [item.index]: item })).reduce((a, b) => ({...a, ...b}), {}));
        });
      }}
      // onRegisterTree={tree => {
      //   dataProvider.getTreeItem(tree.rootItem).then(item => writeItems({ [item.index]: item }));
      // }}
    >
      {props.children}
    </ControlledTreeEnvironment>
  );
}) as <T = any>(p: UncontrolledTreeEnvironmentProps<T> & { ref?: React.Ref<TreeEnvironmentContextProps> }) => React.ReactElement;