import { bindable } from "aurelia-typed-observable-plugin";
import { customElement } from "aurelia-framework";
import "./pbutton.scss";

export type ButtonType = "primary" | "secondary" | "tertiary";

@customElement("pbutton")
export class PButton {
  @bindable.string type: ButtonType;
  @bindable.booleanAttr disabled = false;
}
