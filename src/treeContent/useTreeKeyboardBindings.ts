import { useKey } from '../hotkeys/useKey';
import { useHotkey } from '../hotkeys/useHotkey';
import { useMoveFocusToIndex } from './useMoveFocusToIndex';
import { useContext } from 'react';
import { TreeConfigurationContext } from './Tree';
import { TreeEnvironmentContext } from '../controlledEnvironment/ControlledTreeEnvironment';
import { useViewState } from './useViewState';

export const useTreeKeyboardBindings = (containerRef?: HTMLElement) => {
  const viewState = useViewState();
  const { treeId } = useContext(TreeConfigurationContext);
  const environment = useContext(TreeEnvironmentContext);
  const moveFocusToIndex = useMoveFocusToIndex(containerRef);

  const isActiveTree = environment.activeTreeId === treeId;

  useKey('arrowdown', (e) => {
    e.preventDefault();
    moveFocusToIndex(currentIndex => currentIndex + 1);
  }, isActiveTree);
  useKey('arrowup', (e) => {
    e.preventDefault();
    moveFocusToIndex(currentIndex => currentIndex - 1);
  }, isActiveTree);
  useHotkey('moveFocusToFirstItem', e => {
    e.preventDefault();
    moveFocusToIndex(() => 0);
  }, isActiveTree);
  useHotkey('moveFocusToLastItem', e => {
    e.preventDefault();
    moveFocusToIndex((currentIndex, linearItems) => linearItems.length - 1);
  }, isActiveTree);

  useKey('arrowright', (e) => {
    e.preventDefault();
    moveFocusToIndex((currentIndex, linearItems) => {
      const item = environment.items[linearItems[currentIndex].item];
      if (item.hasChildren) {
        if (viewState.expandedItems?.includes(item.index)) {
          return currentIndex + 1;
        } else {
          environment.onExpandItem?.(item, treeId);
        }
      }
      return currentIndex;
    });
  }, isActiveTree);

  useKey('arrowleft', (e) => {
    e.preventDefault();
    moveFocusToIndex((currentIndex, linearItems) => {
      const item = environment.items[linearItems[currentIndex].item];
      const itemDepth = linearItems[currentIndex].depth;
      if (item.hasChildren && viewState.expandedItems?.includes(item.index)) {
        environment.onCollapseItem?.(item, treeId);
      } else if (itemDepth > 0) {
        let parentIndex = currentIndex;
        for (parentIndex; linearItems[parentIndex].depth !== itemDepth - 1; parentIndex--);
        return parentIndex;
      }
      return currentIndex;
    });
  }, isActiveTree);
}