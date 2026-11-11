import { ConflictError, NotFoundError } from "../../common/errors.js";
import type { Element } from "../../storage/db.types.js";
import type { TemplateStore } from "../../storage/template-store.js";
import type { UpdateElementBody } from "./elements.schemas.js";

export class ElementsService {
  constructor(private readonly store: TemplateStore) {}

  async list(): Promise<Element[]> {
    const data = await this.store.read();
    return data.recipeTemplate.options;
  }

  async create(element: Element): Promise<Element> {
    await this.store.update((data) => {
      const { options } = data.recipeTemplate;
      if (options.some((item) => item.key === element.key)) {
        throw new ConflictError(`Element with key "${element.key}" already exists`);
      }
      options.push(element);
    });
    return element;
  }

  async update(key: string, patch: UpdateElementBody): Promise<void> {
    await this.store.update((data) => {
      const element = data.recipeTemplate.options.find((item) => item.key === key);
      if (!element) throw new NotFoundError(`Element with key "${key}" not found`);
      if (patch.title !== undefined) element.title = patch.title;
      if (patch.value !== undefined) element.value = patch.value;
    });
  }

  async remove(key: string): Promise<void> {
    await this.store.update((data) => {
      const { options } = data.recipeTemplate;
      const index = options.findIndex((item) => item.key === key);
      if (index === -1) throw new NotFoundError(`Element with key "${key}" not found`);
      options.splice(index, 1);
    });
  }
}
