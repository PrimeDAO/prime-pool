import { bindable } from "aurelia-typed-observable-plugin";
import "./loading-dots.scss";

export class LoadingDots {
  @bindable.string tooltip?: string;
}
