import assert from "node:assert/strict";
import { test } from "node:test";
import {
    completeImageDimensions,
    createThumbnail,
    getThumbnailCustomProperties,
} from "./Thumbnail.js";
import {
    fromPercentCoordinates,
    getCoordinateSystem,
    toPercentCoordinates,
} from "../Map/Coordinates.js";

const image = {
    originalDimensions: { width: 4000, height: 2000 },
    previewDimensions: { width: 2000, height: 1000 },
};

test("fits wide and tall previews within both limits without upscaling", () => {
    for (const [width, height] of [
        [2000, 1000],
        [1000, 2000],
        [200, 100],
    ]) {
        const thumbnail = createThumbnail(
            {
                originalDimensions: { width, height },
                previewDimensions: { width, height },
            },
            width,
            height,
        );
        const props = getThumbnailCustomProperties(thumbnail, 800, 500);
        const actualWidth = parseFloat(props["--crop-area-width"]);
        const actualHeight = parseFloat(props["--crop-area-height"]);
        assert.ok(actualWidth <= 800 && actualHeight <= 500);
        assert.ok(actualWidth <= width && actualHeight <= height);
        assert.equal(actualWidth / actualHeight, width / height);
        assert.equal(
            actualWidth,
            Math.min(1, 800 / width, 500 / height) * width,
        );
        assert.equal(
            actualHeight,
            Math.min(1, 800 / width, 500 / height) * height,
        );
    }
});

test("scales crop dimensions and offsets together, preserving annotation percentages", () => {
    const thumbnail = createThumbnail(
        {
            ...image,
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
        1000,
        500,
    );
    assert.deepEqual(getThumbnailCustomProperties(thumbnail, 400, 300), {
        "--crop-area-width": "400px",
        "--crop-area-height": "200px",
        "--thumbnail-width": "800px",
        "--thumbnail-height": "400px",
        "--thumbnail-left": "-200px",
        "--thumbnail-top": "-100px",
    });
    const system = getCoordinateSystem(thumbnail, { x: 2000, y: 1000 });
    const stored = [10, 20, 90, 80];
    assert.deepEqual(
        toPercentCoordinates(fromPercentCoordinates(stored, system), system),
        stored,
    );
});

test("keeps thumbnail dimensions when no size limit is provided", () => {
    const thumbnail = createThumbnail(image, 273, 216);
    const props = getThumbnailCustomProperties(thumbnail);
    assert.equal(parseFloat(props["--crop-area-width"]), 273);
    assert.equal(parseFloat(props["--crop-area-height"]), 136.5);
});

test("completes missing SVG metadata from browser dimensions", () => {
    const svg = completeImageDimensions(
        {
            previewDimensions: { width: null, height: null },
            originalDimensions: null,
        },
        { width: 1200, height: 300 },
    );
    const thumbnail = createThumbnail(svg, 1200, 300);
    assert.equal(thumbnail.hasDimensions, true);
    assert.deepEqual(getThumbnailCustomProperties(thumbnail, 600, 400), {
        "--crop-area-width": "600px",
        "--crop-area-height": "150px",
        "--thumbnail-width": "600px",
        "--thumbnail-height": "150px",
        "--thumbnail-left": "0px",
        "--thumbnail-top": "0px",
    });
});

test("preserves valid metadata and rejects unavailable intrinsic dimensions", () => {
    const completed = completeImageDimensions(image, {
        width: 300,
        height: 150,
    });
    assert.equal(completed.previewDimensions, image.previewDimensions);
    assert.equal(completed.originalDimensions, image.originalDimensions);
    assert.throws(
        () => completeImageDimensions({}, { width: 0, height: 0 }),
        /Cannot determine/,
    );
});

test("enlarges SVG previews to fill either dialog dimension while preserving proportions", () => {
    for (const uri of [
        "/preview/drawing.svg",
        "/preview/drawing.SVG?version=2",
        "data:image/svg+xml,%3Csvg",
    ]) {
        for (const [width, height] of [
            [300, 150],
            [75, 150],
        ]) {
            const svg = completeImageDimensions(
                { previewImageResourceUri: uri },
                { width, height },
            );
            const thumbnail = createThumbnail(svg, width, height);
            for (const [maxWidth, maxHeight] of [
                [800, 500],
                [500, 300],
            ]) {
                const props = getThumbnailCustomProperties(
                    thumbnail,
                    maxWidth,
                    maxHeight,
                );
                const actualWidth = parseFloat(props["--crop-area-width"]);
                const actualHeight = parseFloat(props["--crop-area-height"]);
                const scale = Math.min(maxWidth / width, maxHeight / height);
                assert.equal(actualWidth, width * scale);
                assert.equal(actualHeight, height * scale);
                assert.ok(actualWidth <= maxWidth && actualHeight <= maxHeight);
                assert.ok(
                    actualWidth === maxWidth || actualHeight === maxHeight,
                );
            }
            const props = getThumbnailCustomProperties(thumbnail);
            assert.equal(parseFloat(props["--crop-area-width"]), width);
            assert.equal(parseFloat(props["--crop-area-height"]), height);
        }
    }
});
