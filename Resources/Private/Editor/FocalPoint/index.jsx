import React, { useState, useEffect, useMemo } from "react";
import * as stylex from "@stylexjs/stylex";
import backend from "@neos-project/neos-ui-backend-connector";
import { injectNeosProps, createThumbnail, getImageIdentity } from "../Helper";
import { ImageFocalPoint } from "@lemoncode/react-image-focal-point";
import { Button, Label } from "@neos-project/react-ui-components";
import Dialog from "carbon-neos-editor-styling/Dialog";

const THUMBNAIL_WIDTH = 273;
const THUMBNAIL_HEIGHT = 216;

const styles = stylex.create({
    wrapper: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
        overflow: "hidden",
        padding: 13,
    },
    editorWrapper: {
        width: "var(--crop-area-width, 0)",
        height: "var(--crop-area-height, 0)",
        padding: 13,
        overflow: "clip",
        "::before": {
            content: '""',
            height: "100%",
            width: 1000,
            backgroundColor: "black",
            position: "absolute",
            zIndex: 1,
            right: "100%",
            top: 0,
        },
        "::after": {
            content: '""',
            height: "100%",
            width: 1000,
            backgroundColor: "black",
            position: "absolute",
            zIndex: 1,
            left: "100%",
            top: 0,
        },
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
});

const classes = {
    root: stylex.props(styles.editorWrapper).className,
    focalPoint: stylex.props(styles.focalPoint).className,
};

function mapThumbnailStylesToCustomProps(thumbnail) {
    if (!thumbnail) {
        return {};
    }
    return {
        "--crop-area-width": thumbnail.styles.cropArea.width,
        "--crop-area-height": thumbnail.styles.cropArea.height,
        "--thumbnail-width": thumbnail.styles.thumbnail.width,
        "--thumbnail-height": thumbnail.styles.thumbnail.height,
        "--thumbnail-left": thumbnail.styles.thumbnail.left,
        "--thumbnail-top": thumbnail.styles.thumbnail.top,
    };
}

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
}) {
    const { labelIfEmpty, imageProperty, saveAsJsonString, openInDialog } = { ...config, ...options };
    const [image, setImage] = useState(null);
    const [open, setOpen] = useState(false);
    const [draftFocalPoint, setDraftFocalPoint] = useState(null);
    const imageIdentity = getImageIdentity(getNodeByContextPath, focusedNodePath, imageProperty);

    useEffect(() => {
        if (!imageIdentity) {
            setImage(null);
            return;
        }

        let cancelled = false;
        const { loadImageMetadata } = backend.get().endpoints;
        loadImageMetadata(imageIdentity).then((metadata) => {
            if (!cancelled) {
                setImage(metadata);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [imageIdentity]);

    const thumbnail = useMemo(() => {
        if (!image) {
            return null;
        }
        const width = openInDialog ? image.previewDimensions.width : THUMBNAIL_WIDTH;
        const height = openInDialog ? image.previewDimensions.height : THUMBNAIL_HEIGHT;
        return createThumbnail(image, width, height);
    }, [image, openInDialog]);

    if (!image) {
        if (!labelIfEmpty) {
            return null;
        }
        return i18nRegistry.translate(labelIfEmpty);
    }

    const wrapperProps = stylex.props(styles.wrapper);
    const imageClassName = stylex.props(thumbnail.hasDimensions && styles.image, styles.noPointerEvents).className;
    const currentFocalPoint = value ? (saveAsJsonString ? JSON.parse(value) : value) : undefined;
    const focalPoint = openInDialog ? draftFocalPoint : currentFocalPoint;

    function handleFocalPointChange(point) {
        const data = {
            x: Math.floor(point.x),
            y: Math.floor(point.y),
        };
        if (openInDialog) {
            setDraftFocalPoint(data);
            return;
        }
        commit(saveAsJsonString ? JSON.stringify(data) : data);
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

    const editor = (
        <div
            id={openInDialog ? null : id}
            {...wrapperProps}
            style={{ ...wrapperProps.style, ...mapThumbnailStylesToCustomProps(thumbnail) }}
        >
            <ImageFocalPoint
                focalPoint={focalPoint}
                src={image.previewImageResourceUri}
                classes={{ ...classes, image: imageClassName }}
                onChange={handleFocalPointChange}
            />
        </div>
    );

    if (openInDialog) {
        return (
            <>
                <Button id={id} onClick={openEditor}>
                    {i18nRegistry.translate(label || "Carbon.Editor.Image:Main:focalPoint.edit")}
                </Button>
                <Dialog
                    open={open}
                    setOpen={setOpen}
                    modal={false}
                    title={i18nRegistry.translate(label || "Carbon.Editor.Image:Main:focalPoint.edit")}
                    onApply={applyChanges}
                    onCancel={() => setOpen(false)}
                >
                    {open && editor}
                </Dialog>
            </>
        );
    }

    return (
        <>
            {Boolean(label) && <Label htmlFor={id}>{i18nRegistry.translate(label)}</Label>}
            {editor}
        </>
    );
}

export default injectNeosProps(FocalPointEditor, "FocalPoint");
