import React, { HTMLProps, useContext } from 'react';
import { TreeItem } from './TreeItem';
import { TreeItemIndex, TreeProps } from '../types';
import { useTree } from '../tree/Tree';

export const TreeItemChildren = <T extends any>(props: {
  children: TreeItemIndex[];
  depth: number;
  parentId: TreeItemIndex;
}): JSX.Element => {
  const { renderers, treeInformation } = useTree();

  let childElements: JSX.Element[] = [];

  for (const child of props.children) {
    childElements.push(
      <TreeItem
        key={child}
        itemIndex={child}
        depth={props.depth}
      />
    );
  }

  if (childElements.length === 0) {
    return null as any;
  }

  const containerProps: HTMLProps<any> = {
    role: 'group',
  };

  return renderers.renderItemsContainer({
    children: childElements,
    info: treeInformation,
    containerProps,
  }) as any;
}