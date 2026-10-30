import React, { useState, useMemo } from "react";
import * as stylex from "@stylexjs/stylex";
import { injectNeosProps, createThumbnail, getImageIdentity, useImageMetadata, ImagePreview } from "../Helper";
import { ImageFocalPoint } from "@lemoncode/react-image-focal-point";
import { Button } from "@neos-project/react-ui-components";
import Dialog from "carbon-neos-editor-styling/Dialog";

const styles = stylex.create({
    editorWrapper: {
        position: "relative",
        width: "var(--crop-area-width, 0)",
        height: "var(--crop-area-height, 0)",
        overflow: "clip",
    },
    focalPoint: {
        zIndex: 100,
    },
    noPointerEvents: {
        pointerEvents: "none",
    },
    image: {
        position: "absolute",
        width: "var(--thumbnail-width, 0)",
        height: "var(--thumbnail-height, 0)",
        left: "var(--thumbnail-left, 0)",
        top: "var(--thumbnail-top, 0)",
    },
    highlight: {
        borderRadius: 2,
        outline: "2px solid var(--colors-Warn)",
        outlineOffset: 2,
    },
});

const classes = {
    root: stylex.props(styles.editorWrapper).className,
    focalPoint: stylex.props(styles.focalPoint).className,
};

function FocalPointEditor({
    commit,
    value,
    label,
    i18nRegistry,
    options,
    config,
    id,
    getNodeByContextPath,
    focusedNodePath,
    highlight,
}) {
    const { labelIfEmpty, imageProperty, saveAsJsonString } = { ...config, ...options };
    const [open, setOpen] = useState(false);
    const [draftFocalPoint, setDraftFocalPoint] = useState(null);
    const imageIdentity = getImageIdentity(getNodeByContextPath, focusedNodePath, imageProperty);
    const image = useImageMetadata(imageIdentity);

    const thumbnail = useMemo(
        () => (image ? createThumbnail(image, image.previewDimensions.width, image.previewDimensions.height) : null),
        [image],
    );

    if (!image) {
        if (!labelIfEmpty) {
            return null;
        }
        return i18nRegistry.translate(labelIfEmpty);
    }

    const imageClassName = stylex.props(thumbnail.hasDimensions && styles.image, styles.noPointerEvents).className;
    const currentFocalPoint = value ? (saveAsJsonString ? JSON.parse(value) : value) : undefined;

    function handleFocalPointChange(point) {
        setDraftFocalPoint({
            x: Math.floor(point.x),
            y: Math.floor(point.y),
        });
    }

    function openEditor() {
        setDraftFocalPoint(currentFocalPoint);
        setOpen(true);
    }

    function applyChanges() {
        if (draftFocalPoint) {
            commit(saveAsJsonString ? JSON.stringify(draftFocalPoint) : draftFocalPoint);
        }
        setOpen(false);
    }

    return (
        <>
            <Button
                id={id}
                onClick={openEditor}
                className={highlight ? stylex.props(styles.highlight).className : undefined}
            >
                {i18nRegistry.translate(label || "Carbon.Editor.Image:Main:focalPoint.edit")}
            </Button>
            <Dialog
                open={open}
                setOpen={setOpen}
                title={i18nRegistry.translate(label || "Carbon.Editor.Image:Main:focalPoint.edit")}
                onApply={applyChanges}
                onCancel={() => setOpen(false)}
            >
                {open && (
                    <ImagePreview thumbnail={thumbnail}>
                        <ImageFocalPoint
                            focalPoint={draftFocalPoint}
                            src={image.previewImageResourceUri}
                            classes={{ ...classes, image: imageClassName }}
                            onChange={handleFocalPointChange}
                        />
                    </ImagePreview>
                )}
            </Dialog>
        </>
    );
}

export default injectNeosProps(FocalPointEditor, "FocalPoint");
