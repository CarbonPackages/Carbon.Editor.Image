export function getCoordinateSystem(thumbnail, imageSize) {
    if (!imageSize) {
        return null;
    }
    if (!thumbnail.hasDimensions) {
        return { offset: { x: 0, y: 0 }, size: imageSize };
    }
    const scaleX = imageSize.x / thumbnail.dimensions.width;
    const scaleY = imageSize.y / thumbnail.dimensions.height;
    return {
        offset: {
            x: -parseFloat(thumbnail.styles.thumbnail.left) * scaleX,
            y: -parseFloat(thumbnail.styles.thumbnail.top) * scaleY,
        },
        size: {
            x: thumbnail.cropDimensions.width * scaleX,
            y: thumbnail.cropDimensions.height * scaleY,
        },
    };
}

export function toPercentCoordinates(coords, { offset, size }) {
    return coords.map((value, index) => {
        const axis = index % 2 === 0 ? "x" : "y";
        return ((value - offset[axis]) / size[axis]) * 100;
    });
}

export function fromPercentCoordinates(coords, { offset, size }) {
    return coords.map((value, index) => {
        const axis = index % 2 === 0 ? "x" : "y";
        return (value * size[axis]) / 100 + offset[axis];
    });
}

// Circle radii are relative to the cropped width, like the x coordinates of HTML image maps.
export function toPercentCircleCoordinates([cx, cy, r], coordinateSystem) {
    return [...toPercentCoordinates([cx, cy], coordinateSystem), (r / coordinateSystem.size.x) * 100];
}

export function fromPercentCircleCoordinates([cx, cy, r], coordinateSystem) {
    return [...fromPercentCoordinates([cx, cy], coordinateSystem), (r * coordinateSystem.size.x) / 100];
}
