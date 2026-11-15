import { ShapeType } from "@annotorious/react";

// Annotorious only mounts drawing tools and shape editors with `new Component({ target, props })` and talks to them
// through `$set`, `$$set`, `$on` and `$destroy`. These classes implement that interface without Svelte. Circles use the
// built-in ellipse shape, so Annotorious can render and hit-test them, but `rx` and `ry` always stay equal.

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const MIN_RADIUS = 2;
const HANDLES = [
    { name: "TOP", x: 0, y: -1, className: "carbon-image-map-circle-handle-vertical" },
    { name: "RIGHT", x: 1, y: 0, className: "carbon-image-map-circle-handle-horizontal" },
    { name: "BOTTOM", x: 0, y: 1, className: "carbon-image-map-circle-handle-vertical" },
    { name: "LEFT", x: -1, y: 0, className: "carbon-image-map-circle-handle-horizontal" },
];

export function createCircleShape(cx, cy, r) {
    return {
        type: ShapeType.ELLIPSE,
        geometry: {
            cx,
            cy,
            rx: r,
            ry: r,
            bounds: { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r },
        },
    };
}

function setAttributes(element, attributes) {
    Object.entries(attributes).forEach(([name, value]) => {
        if (value === undefined || value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    });
}

function createSvgElement(name, attributes, parent) {
    const element = document.createElementNS(SVG_NAMESPACE, name);
    setAttributes(element, attributes);
    parent.appendChild(element);
    return element;
}

function createCircleElements(parent, innerClassName) {
    const maskId = `carbon-image-map-circle-mask-${Math.random().toString(36).slice(2, 12)}`;
    const mask = createSvgElement("mask", { id: maskId }, createSvgElement("defs", {}, parent));
    return {
        // Inline styles are required because Annotorious sets `fill: transparent` on all shapes.
        maskBackground: createSvgElement("rect", { style: "fill:#fff" }, mask),
        maskForeground: createSvgElement("ellipse", { style: "fill:#000" }, mask),
        outer: createSvgElement("ellipse", { class: "a9s-outer", mask: `url(#${maskId})` }, parent),
        inner: createSvgElement("ellipse", { class: innerClassName }, parent),
    };
}

function renderCircleElements(elements, cx, cy, r, buffer) {
    setAttributes(elements.maskBackground, {
        x: cx - r - buffer,
        y: cy - r - buffer,
        width: 2 * (r + buffer),
        height: 2 * (r + buffer),
    });
    [elements.maskForeground, elements.outer, elements.inner].forEach((element) =>
        setAttributes(element, { cx, cy, rx: r, ry: r }),
    );
}

class SvgComponent {
    constructor({ target, props }, className) {
        this.props = props;
        this.listeners = {};
        this.element = createSvgElement("g", { class: className }, target);
        this.svg = target.closest("svg");
    }

    $on(type, callback) {
        this.listeners[type] = this.listeners[type] || new Set();
        this.listeners[type].add(callback);
        return () => this.listeners[type].delete(callback);
    }

    $set(props) {
        this.props = { ...this.props, ...props };
        this.render();
    }

    $$set(props) {
        this.$set(props);
    }

    $destroy() {
        this.listeners = {};
        this.element.remove();
    }

    get scale() {
        return this.props.viewportScale || 1;
    }

    dispatch(type, detail) {
        this.listeners[type]?.forEach((callback) => callback(new CustomEvent(type, { detail })));
    }

    getImagePoint(event) {
        const { left, top, width, height } = this.svg.getBoundingClientRect();
        return this.props.transform.elementToImage(
            (event.clientX - left) * (this.svg.clientWidth / width),
            (event.clientY - top) * (this.svg.clientHeight / height),
        );
    }
}

// Drawing starts at the circle center; the pointer distance defines the radius.
export class CircleTool extends SvgComponent {
    constructor(options) {
        super(options, "a9s-annotation a9s-rubberband");
        this.circle = createCircleElements(this.element, "a9s-inner");
        this.center = null;
        this.radius = 0;

        const { addEventListener } = this.props;
        addEventListener("pointerdown", (event) => this.onPointerDown(event));
        addEventListener("pointermove", (event) => this.onPointerMove(event));
        addEventListener("pointerup", (event) => this.onPointerUp(event), true);
        this.render();
    }

    start(event) {
        this.center = this.getImagePoint(event);
        this.radius = 0;
        this.render();
    }

    reset() {
        this.center = null;
        this.radius = 0;
        this.render();
    }

    finish() {
        if (this.radius > MIN_RADIUS) {
            this.dispatch("create", createCircleShape(this.center[0], this.center[1], this.radius));
        }
        this.reset();
    }

    onPointerDown(event) {
        this.lastPointerDown = performance.now();
        if (this.props.drawingMode === "drag") {
            this.start(event);
        }
    }

    onPointerMove(event) {
        if (!this.center) {
            return;
        }
        const [x, y] = this.getImagePoint(event);
        this.radius = Math.hypot(x - this.center[0], y - this.center[1]);
        this.render();
    }

    // Mirrors the click/drag handling of the built-in rectangle tool.
    onPointerUp(event) {
        const duration = performance.now() - this.lastPointerDown;

        if (this.props.drawingMode === "click") {
            if (duration > 300) {
                return;
            }
            if (this.center) {
                this.finish();
            } else {
                this.start(event);
            }
            return;
        }

        if (!this.center) {
            return;
        }
        if (duration > 300 || this.radius > 5) {
            event.stopPropagation();
            this.finish();
        } else {
            this.reset();
        }
    }

    render() {
        this.element.style.display = this.center ? "" : "none";
        if (this.center) {
            renderCircleElements(this.circle, this.center[0], this.center[1], this.radius, 2 / this.scale);
        }
    }
}

export function editCircleShape(shape, handle, origin, point) {
    const { cx, cy, rx } = shape.geometry;
    if (handle === "SHAPE") {
        return createCircleShape(cx + point[0] - origin[0], cy + point[1] - origin[1], rx);
    }
    // Resizing keeps the center fixed and follows the pointer distance without jumping to the grabbed position.
    const distance = (x, y) => Math.hypot(x - cx, y - cy);
    const radius = rx + distance(point[0], point[1]) - distance(origin[0], origin[1]);
    return createCircleShape(cx, cy, Math.max(MIN_RADIUS, radius));
}

export class CircleEditor extends SvgComponent {
    constructor(options) {
        super(options, "a9s-annotation selected");
        if (this.props.svgEl) {
            this.svg = this.props.svgEl;
        }
        this.circle = createCircleElements(this.element, "a9s-inner a9s-shape-handle");
        this.circle.outer.addEventListener("pointerdown", (event) => this.grab("SHAPE", event));
        this.circle.inner.addEventListener("pointerdown", (event) => this.grab("SHAPE", event));

        const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
        this.handles = HANDLES.map((definition) => {
            const group = createSvgElement("g", { class: `a9s-handle ${definition.className}` }, this.element);
            const buffer = createSvgElement("circle", { class: "a9s-handle-buffer" }, group);
            const dot = createSvgElement("circle", { class: "a9s-handle-dot" }, group);
            buffer.addEventListener("pointerdown", (event) => this.grab(definition.name, event));
            return { definition, buffer, dot, bufferSize: isTouch ? 10 : 6 };
        });

        this.element.addEventListener("pointermove", (event) => this.onPointerMove(event));
        this.element.addEventListener("pointerup", (event) => this.onPointerUp(event));
        this.render();
    }

    grab(handle, event) {
        this.grabbed = { handle, origin: this.getImagePoint(event), shape: this.props.shape };
        event.target.setPointerCapture(event.pointerId);
        this.dispatch("grab", event);
    }

    onPointerMove(event) {
        if (!this.grabbed) {
            return;
        }
        const { handle, origin, shape } = this.grabbed;
        this.grabbed.moved = true;
        this.$set({ shape: editCircleShape(shape, handle, origin, this.getImagePoint(event)) });
        this.dispatch("change", this.props.shape);
    }

    onPointerUp(event) {
        if (event.target.hasPointerCapture?.(event.pointerId)) {
            event.target.releasePointerCapture(event.pointerId);
        }
        // A quick drag would otherwise be treated as a click by Annotorious and may deselect the circle.
        if (this.grabbed?.moved) {
            event.stopPropagation();
        }
        this.grabbed = null;
        this.dispatch("release", event);
    }

    render() {
        const { cx, cy, rx: r } = this.props.shape.geometry;
        const { scale } = this;
        renderCircleElements(this.circle, cx, cy, r, 2 / scale);
        setAttributes(this.circle.inner, { style: this.props.computedStyle });

        const handleRadius = 4 / scale;
        this.handles.forEach(({ definition, buffer, dot, bufferSize }) => {
            const position = { cx: cx + definition.x * r, cy: cy + definition.y * r };
            setAttributes(buffer, { ...position, r: handleRadius + bufferSize / scale });
            setAttributes(dot, { ...position, r: handleRadius });
        });
    }
}

export function registerCircleTool(anno) {
    anno.registerDrawingTool("circle", CircleTool);
    anno.registerShapeEditor(ShapeType.ELLIPSE, CircleEditor);
}
