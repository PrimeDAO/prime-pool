export class Documentation {

  canActivate(): boolean {
    window.open("https://docs.primedao.io/", "_blank");
    return false;
  }
}
