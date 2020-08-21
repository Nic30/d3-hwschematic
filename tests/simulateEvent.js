"use strict";


export function simulateEvent(element, eventName, eventData) {
	if (eventName === 'drag') {
		let rect = element.getBoundingClientRect();
		let screen = {
			x: window.screenX + rect.left,
			y: window.screenY + rect.top,
		};
		let client = {
			x: rect.left,
			y: rect.top,
		}
		var dx = eventData.deltaX;
		var dy = eventData.deltaY;
		_simulateEvent(element, 'mousedown', {
			screenX: screen.x,
			screenY: screen.y,
			clientX: client.x,
			clientY: client.y,
		});
		_simulateEvent(element, 'mousemove', {
			screenX: screen.x + dx,
			screenY: screen.y + dy,
			clientX: client.x + dx,
			clientY: client.y + dy,
		});
		_simulateEvent(element, 'mouseup', {
			screenX: screen.x + dx,
			screenY: screen.y + dy,
			clientX: client.x + dx,
			clientY: client.y + dy,
		});
	} else if (eventName === 'click') {
		_simulateEvent(element, 'mousedown', eventData);
		_simulateEvent(element, 'click', eventData);
		_simulateEvent(element, 'mouseup', eventData);
	} else {
		_simulateEvent(element, eventName, eventData)
	}
}

export function _simulateEvent(element, eventName, eventData) {
	var eventType;
	if (['mousedown', 'mousemove', 'mouseup', 'click'].includes(eventName)) {
		eventType = MouseEvent;
	} else if ('wheel' == eventName) {
		eventType = WheelEvent;
	} else {
		throw new Error("NotImplementedError");
	}
	eventData['view'] = window;
	const event = new eventType(eventName, eventData);
	element.dispatchEvent(event);
}
