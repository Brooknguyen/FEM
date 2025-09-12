import { fetchItems } from "../services/info.service.js";

export const InfoStore = {
  items: [],
  query: "",
  tab: "vtsp", // vtsp | lôhàng | kho | vị trí kho ...
  sortKey: "",
  sortDir: 1, // 1 asc, -1 desc
  async load() {
    this.items = await fetchItems();
  },
  setSort(key) {
    if (this.sortKey === key) {
      this.sortDir *= -1;
    } else {
      this.sortKey = key;
      this.sortDir = 1;
    }
  },
  filtered() {
    const q = this.query.toLowerCase();
    let base = this.items.filter((r) =>
      (r.code + r.name + r.group1 + r.group2 + r.status)
        .toLowerCase()
        .includes(q)
    );
    if (this.sortKey) {
      base.sort(
        (a, b) => (a[this.sortKey] > b[this.sortKey] ? 1 : -1) * this.sortDir
      );
    }
    return base;
  },
  totals() {
    return { count: this.filtered().length };
  },
};
