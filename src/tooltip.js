export class Tooltip {
  constructor(root) {
  	var t = this.tooltip = document.createElement("div");
  	t.className = "hwschematic-tooltip"
    t.style.display = "none";
    t.style.possition = "absolute"
    root.appendChild(t);
  }
  
  show(evt, text) {
    var t = this.tooltip;
	t.style.display = "block";
    t.innerHTML = text;
    t.style.left = evt.pageX + 10 + 'px';
    t.style.top = evt.pageY + 10 + 'px';
  }
  
  hide() {
    this.tooltip.style.display = "none";
  }
}