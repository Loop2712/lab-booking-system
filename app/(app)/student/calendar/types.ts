export type UIEvent = {
  kind: "CLASS" | "IN_CLASS" | "AD_HOC";
  title: string;
  time: string;
  meta: string;
  raw?: any;
};
