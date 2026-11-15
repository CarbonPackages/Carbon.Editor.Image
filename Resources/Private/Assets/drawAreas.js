// Helper for development: draws areas on image maps for easier visualization

[...document.querySelectorAll('[data-event-on-load="image-maps:init"]')].forEach((wrapper) => {
    wrapper.style.position = "relative";
    const img = wrapper.querySelector("img[usemap]");
    if (!img) {
        return;
    }
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    wrapper.append(canvas);
    const ctx = canvas.getContext("2d");
    const mapName = img.getAttribute("usemap").slice(1);
    const map = document.querySelector(`map[name="${CSS.escape(mapName)}"]`);
    new ResizeObserver(() => drawAreas(img, canvas, ctx, map)).observe(img);
});

function drawAreas(img, canvas, ctx, map) {
    const { width, height } = img.getBoundingClientRect();
    const dpr = window.devicePixelRatio;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "rgb(0 130 255 / 25%)";
    ctx.strokeStyle = "#0082ff";
    ctx.lineWidth = 2;

    for (const area of map.querySelectorAll("area[coords]")) {
        const coords = area.coords.split(",").map(Number);
        const [x, y, a, b] = coords;

        ctx.beginPath();

        switch (area.shape.toLowerCase()) {
            case "rect":
                ctx.rect(x, y, a - x, b - y);
                break;
            case "circle":
                ctx.arc(x, y, a, 0, 2 * Math.PI);
                break;
            case "poly":
                ctx.moveTo(x, y);
                for (let i = 2; i < coords.length; i += 2) {
                    ctx.lineTo(coords[i], coords[i + 1]);
                }
                ctx.closePath();
                break;
        }

        ctx.fill();
        ctx.stroke();
    }
}
