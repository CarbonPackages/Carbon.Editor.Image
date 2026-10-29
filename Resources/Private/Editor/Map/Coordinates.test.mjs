import assert from "node:assert/strict";
import { test } from "node:test";
import {
    getCoordinateSystem,
    toPercentCoordinates,
    fromPercentCoordinates,
} from "./Coordinates.js";
import { createThumbnail } from "../Helper/Thumbnail.js";

test("preserves percentages for a scaled preview of a cropped image", () => {
    const thumbnail = createThumbnail(
        {
            originalDimensions: { width: 4000, height: 2000 },
            previewDimensions: { width: 1000, height: 500 },
            object: {
                adjustments: {
                    "Neos\\Media\\Domain\\Model\\Adjustment\\CropImageAdjustment":
                        {
                            x: 1000,
                            y: 500,
                            width: 2000,
                            height: 1000,
                        },
                },
            },
        },
        500,
        250,
    );
    const system = getCoordinateSystem(thumbnail, { x: 1000, y: 500 });
    assert.deepEqual(
        toPercentCoordinates([250, 125, 750, 375], system),
        [0, 0, 100, 100],
    );
    assert.deepEqual(
        fromPercentCoordinates([25, 50, 75, 100], system),
        [375, 250, 625, 375],
    );
});

test("normalizes each axis using the actual annotator dimensions", () => {
    const thumbnail = {
        hasDimensions: true,
        dimensions: { width: 800, height: 200 },
        cropDimensions: { width: 800, height: 200 },
        styles: { thumbnail: { left: "0px", top: "0px" } },
    };
    const system = getCoordinateSystem(thumbnail, { x: 1600, y: 1200 });
    const rectangle = [160, 300, 1440, 900];
    assert.deepEqual(toPercentCoordinates(rectangle, system), [10, 25, 90, 75]);
    assert.deepEqual(
        fromPercentCoordinates([10, 25, 90, 75], system),
        rectangle,
    );
});

test("uses the visible crop for rectangle and polygon percentages", () => {
    const thumbnail = {
        hasDimensions: true,
        dimensions: { width: 800, height: 400 },
        cropDimensions: { width: 400, height: 200 },
        styles: { thumbnail: { left: "-200px", top: "-100px" } },
    };
    const system = getCoordinateSystem(thumbnail, { x: 1600, y: 1200 });
    assert.deepEqual(system, {
        offset: { x: 400, y: 300 },
        size: { x: 800, y: 600 },
    });
    assert.deepEqual(
        toPercentCoordinates([400, 300, 1200, 900], system),
        [0, 0, 100, 100],
    );
    const polygon = [400, 300, 800, 900, 1200, 300];
    assert.deepEqual(
        toPercentCoordinates(polygon, system),
        [0, 0, 50, 100, 100, 0],
    );
    assert.deepEqual(
        fromPercentCoordinates([0, 0, 50, 100, 100, 0], system),
        polygon,
    );
});

test("handles dimensionless SVGs without mixing metadata and viewBox dimensions", () => {
    const system = getCoordinateSystem(
        { hasDimensions: false },
        { x: 1200, y: 300 },
    );
    assert.deepEqual(
        toPercentCoordinates([120, 75, 1080, 225], system),
        [10, 25, 90, 75],
    );
    assert.deepEqual(
        fromPercentCoordinates([10, 25, 90, 75], system),
        [120, 75, 1080, 225],
    );
    assert.equal(getCoordinateSystem({ hasDimensions: false }, null), null);
});
