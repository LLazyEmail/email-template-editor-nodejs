const addNodeTree = (itemToAdd1, treeData1, parentKey) => {
  const findAndAddItem = (treeData) => {
    treeData.forEach((item) => {
      if (item.key === parentKey) {
        item.children.push(itemToAdd1);
      }

      if (!item.children) {
        return;
      }

      findAndAddItem(item.children);
    });
  };

  findAndAddItem(treeData1);

  return treeData1;
};

export { addNodeTree };
