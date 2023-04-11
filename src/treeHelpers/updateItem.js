const updateItem = (itemToUpdate1, treeData1) => {
  const findAndUpdateItem = (treeData) => {
    treeData.forEach((item) => {
      if (item.key === itemToUpdate1.key) {
        item.value = itemToUpdate1.value;
        item.title = itemToUpdate1.title;
      }

      if (!item.children) {
        return;
      }

      findAndUpdateItem(item.children);
    });
  };

  findAndUpdateItem(treeData1);

  return treeData1;
};

export { updateItem };
