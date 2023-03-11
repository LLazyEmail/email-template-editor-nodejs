const getValue = (children, parentValue) => {
  if (!children?.length) {
    return parentValue;
  }

  let parentValueTmp = parentValue;

  children.forEach((item) => {
    if (!item.children?.length) {
      parentValueTmp = parentValueTmp.replace(item.title, item.value);

      return;
    }

    const value = getValue(item.children, item.value);
    parentValueTmp = parentValueTmp.replace(item.title, value);
  });

  return parentValueTmp;
};

const generateHTML = (treeData) => {
  return getValue(treeData[0].children, treeData[0].value);
};

export { generateHTML };
