const deleteItem = (itemKey, treeData1) => {
  const findAndDeleteItem = (treeData) => {
    const foundElement = treeData.find((item) => {
      if (item.key === itemKey) {
        return true;
      }

      if (!item.children) {
        return false;
      }

      return findAndDeleteItem(item.children);
    });

    if (foundElement) {
      console.log("found", foundElement);
      const index = treeData.indexOf(foundElement);
      if (index > -1) {
        treeData.splice(index, 1);
      }
    }
  };

  findAndDeleteItem(treeData1);

  return treeData1;
};

export { deleteItem };
