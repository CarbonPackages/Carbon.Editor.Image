import React, { useState, useEffect, useRef, useMemo } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button, Icon, Label } from "@neos-project/react-ui-components";
import {
    Annotorious,
    ImageAnnotator,
    ImageAnnotationPopup,
    useAnnotator,
    boundsFromPoints,
    ShapeType,
} from "@annotorious/react";
import { injectNeosProps, getImageIdentity, createThumbnail, useImageMetadata, ImagePreview } from "../Helper";
import Dialog from "carbon-neos-editor-styling/Dialog";
import { getAreaProperties, getAreaData } from "./AreaProperties";
import { getCoordinateSystem, toPercentCoordinates, fromPercentCoordinates } from "./Coordinates";

const styles = stylex.create({
    content: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-Half)",
        padding: "var(--spacing-Full)",
        overflow: "auto",
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-Half)",
    },
    hint: {
        fontSize: 12,
        color: "var(--colors-ContrastBright)",
    },
    imageViewport: {
        position: "relative",
        width: "var(--crop-area-width, 0)",
        height: "var(--crop-area-height, 0)",
        overflow: "hidden",
    },
    annotator: {
        width: "var(--thumbnail-width, 0)",
        height: "var(--thumbnail-height, 0)",
        left: "var(--thumbnail-left, 0)",
        top: "var(--thumbnail-top, 0)",
    },
    image: {
        display: "block",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
    },
    deleteAllButton: {
        marginLeft: "auto",
    },
    popup: {
        display: "flex",
        flexDirection: "column",
        width: 320,
        backgroundColor: "var(--colors-ContrastDarker)",
        color: "var(--colors-ContrastBrightest)",
        boxShadow: "0 0 0 1px var(--colors-ContrastDark), 0 10px 20px #0006",
        padding: "var(--spacing-Full)",
        gap: "var(--spacing-Full)",
    },
    field: {
        display: "flex",
        flexDirection: "column",
    },
    popupFooter: {
        display: "flex",
        justifyContent: "space-between",
        gap: "var(--spacing-Quarter)",
        paddingTop: "var(--spacing-Full)",
    },
    highlight: {
        borderRadius: 2,
        outline: "2px solid var(--colors-Warn)",
        outlineOffset: 2,
    },
});

function parseAreas(value) {
    if (!value) {
        return [];
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return Array.isArray(value) ? value : [];
}

function getAnnotatorImageSize(annotator, fallbackSize) {
    const svg = annotator?.element.querySelector("svg");
    const viewBox = svg?.viewBox.baseVal;
    if (viewBox?.width > 0 && viewBox?.height > 0) {
        return { x: viewBox.width, y: viewBox.height };
    }

    return fallbackSize;
}

// Converts an area relative to the cropped output into preview image coordinates.
function areaToAnnotation(area, coordinateSystem, index) {
    const coords = fromPercentCoordinates(
        Array.isArray(area.coords) ? area.coords.map(Number) : [],
        coordinateSystem,
    ).filter((number) => !isNaN(number));
    const id = `area-${index}-${Math.random().toString(36).slice(2)}`;

    let selector = null;
    if (area.shape === "rect" && coords.length >= 4) {
        const [x1, y1, x2, y2] = coords;
        selector = {
            type: ShapeType.RECTANGLE,
            geometry: {
                x: x1,
                y: y1,
                w: x2 - x1,
                h: y2 - y1,
                bounds: { minX: x1, minY: y1, maxX: x2, maxY: y2 },
            },
        };
    }
    if (area.shape === "poly" && coords.length >= 6) {
        const points = [];
        for (let i = 0; i < coords.length - 1; i += 2) {
            points.push([coords[i], coords[i + 1]]);
        }
        selector = {
            type: ShapeType.POLYGON,
            geometry: { points, bounds: boundsFromPoints(points) },
        };
    }
    if (!selector) {
        return null;
    }

    return {
        id,
        bodies: [],
        target: { annotation: id, selector },
    };
}

// Converts preview image coordinates into coordinates relative to the cropped output.
function annotationsToAreas(annotations, areaData, coordinateSystem, areaProperties) {
    return annotations
        .map((annotation) => {
            const { selector } = annotation.target;
            let shape = null;
            let coords = [];

            if (selector.type === ShapeType.RECTANGLE) {
                const { x, y, w, h } = selector.geometry;
                shape = "rect";
                coords = [x, y, x + w, y + h];
            }
            if (selector.type === ShapeType.POLYGON) {
                shape = "poly";
                coords = selector.geometry.points.flat();
            }
            if (!shape) {
                return null;
            }

            const data = areaData[annotation.id] || {};
            return {
                ...getAreaData(data, areaProperties),
                shape,
                coords: toPercentCoordinates(coords, coordinateSystem),
            };
        })
        .filter(Boolean);
}

function AreaPopup({
    annotation,
    areaData,
    setAreaData,
    onDelete,
    onClose,
    areaProperties,
    editorsRegistry,
    i18nRegistry,
}) {
    const data = getAreaData(areaData[annotation.id], areaProperties);
    const update = (partial) =>
        setAreaData((current) => ({
            ...current,
            [annotation.id]: { ...current[annotation.id], ...partial },
        }));

    return (
        <div {...stylex.props(styles.popup)}>
            {Object.entries(areaProperties).map(([name, definition]) => {
                const registeredEditor = editorsRegistry.get(definition.editor);
                const Editor = registeredEditor?.component;
                if (!Editor) {
                    throw new Error(`Unknown image map area editor "${definition.editor}" for "${name}".`);
                }
                const id = `carbon-map-${annotation.id}-${name}`;
                const label = i18nRegistry.translate(definition.label || name);
                return (
                    <div {...stylex.props(styles.field)} key={name}>
                        {!registeredEditor.hasOwnLabel && <Label htmlFor={id}>{label}</Label>}
                        <Editor
                            id={id}
                            identifier={id}
                            label={registeredEditor.hasOwnLabel ? label : undefined}
                            value={data[name]}
                            commit={(value) => update({ [name]: value })}
                            options={definition.editorOptions || {}}
                        />
                    </div>
                );
            })}
            <div {...stylex.props(styles.popupFooter)}>
                <Button hoverStyle="error" size="small" onClick={onDelete}>
                    <Icon icon="trash" padded="right" />
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.delete")}
                </Button>
                <Button onClick={onClose} size="small">
                    <Icon icon="times" padded="right" />
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.close")}
                </Button>
            </div>
        </div>
    );
}

function MapDialogContent({
    image,
    initialAreas,
    thumbnail,
    annoRef,
    areaData,
    setAreaData,
    areaProperties,
    editorsRegistry,
    i18nRegistry,
}) {
    const anno = useAnnotator();
    const [tool, setTool] = useState(null);
    const fallbackImageSize = thumbnail.hasDimensions
        ? {
              x: image.previewDimensions.width,
              y: image.previewDimensions.height,
          }
        : null;
    const coordinateSystem = getCoordinateSystem(thumbnail, getAnnotatorImageSize(anno, fallbackImageSize));

    useEffect(() => {
        if (!anno || !coordinateSystem) {
            return;
        }
        annoRef.current = anno;
        const annotations = [];
        const data = {};
        initialAreas.forEach((area, index) => {
            const annotation = areaToAnnotation(area, coordinateSystem, index);
            if (annotation) {
                annotations.push(annotation);
                data[annotation.id] = getAreaData(area, areaProperties);
            }
        });
        anno.setAnnotations(annotations);
        setAreaData(data);

        const handleCreate = () => setTool(null);
        anno.on("createAnnotation", handleCreate);

        return () => {
            anno.off("createAnnotation", handleCreate);
            annoRef.current = null;
        };
    }, [
        anno,
        initialAreas,
        coordinateSystem?.offset.x,
        coordinateSystem?.offset.y,
        coordinateSystem?.size.x,
        coordinateSystem?.size.y,
        areaProperties,
        setAreaData,
    ]);

    function toggleTool(name) {
        setTool((current) => (current === name ? null : name));
    }

    function deleteAllAreas() {
        anno.getAnnotations().forEach(({ id }) => anno.removeAnnotation(id));
        setAreaData({});
        setTool(null);
    }

    return (
        <div {...stylex.props(styles.content)}>
            <div {...stylex.props(styles.toolbar)}>
                <Button
                    size="small"
                    style={tool === "rectangle" ? "brand" : "lighter"}
                    onClick={() => toggleTool("rectangle")}
                >
                    <Icon icon="vector-square" padded="right" />
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.rectangle")}
                </Button>
                <Button
                    size="small"
                    style={tool === "polygon" ? "brand" : "lighter"}
                    onClick={() => toggleTool("polygon")}
                >
                    <Icon icon="pencil" padded="right" />
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.polygon")}
                </Button>
                <span {...stylex.props(styles.hint)}>
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.hint")}
                </span>
                <Button
                    size="small"
                    hoverStyle="error"
                    onClick={deleteAllAreas}
                    className={stylex.props(styles.deleteAllButton).className}
                >
                    <Icon icon="trash" padded="right" />
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.deleteAll")}
                </Button>
            </div>
            <ImagePreview thumbnail={thumbnail}>
                <div {...stylex.props(styles.imageViewport)}>
                    <ImageAnnotator
                        containerClassName={stylex.props(styles.annotator).className}
                        tool={tool || undefined}
                        drawingEnabled={Boolean(tool)}
                        drawingMode={tool === "polygon" ? "click" : "drag"}
                    >
                        <img src={image.previewImageResourceUri} alt="" {...stylex.props(styles.image)} />
                    </ImageAnnotator>
                </div>
            </ImagePreview>
            <ImageAnnotationPopup
                popup={({ annotation }) => (
                    <AreaPopup
                        annotation={annotation}
                        areaData={areaData}
                        setAreaData={setAreaData}
                        onDelete={() => anno.removeAnnotation(annotation.id)}
                        onClose={() => anno.cancelSelected()}
                        areaProperties={areaProperties}
                        editorsRegistry={editorsRegistry}
                        i18nRegistry={i18nRegistry}
                    />
                )}
            />
        </div>
    );
}

function MapEditor({
    commit,
    value,
    label,
    i18nRegistry,
    editorsRegistry,
    options,
    config,
    id,
    getNodeByContextPath,
    focusedNodePath,
    highlight,
}) {
    const { labelIfEmpty, imageProperty, saveAsJsonString } = { ...config, ...options };
    const areaProperties = useMemo(
        () => getAreaProperties(config?.areaProperties, options?.areaProperties),
        [config?.areaProperties, options?.areaProperties],
    );
    const [open, setOpen] = useState(false);
    const [initialAreas, setInitialAreas] = useState([]);
    const [areaData, setAreaData] = useState({});
    const annoRef = useRef(null);
    const imageIdentity = getImageIdentity(getNodeByContextPath, focusedNodePath, imageProperty);
    const image = useImageMetadata(imageIdentity);
    const thumbnail = useMemo(
        () => (image ? createThumbnail(image, image.previewDimensions.width, image.previewDimensions.height) : null),
        [image],
    );

    const areas = useMemo(() => parseAreas(value), [value]);

    if (!image) {
        if (!labelIfEmpty) {
            return null;
        }
        return i18nRegistry.translate(labelIfEmpty);
    }

    function openEditor() {
        setInitialAreas(areas);
        setAreaData({});
        setOpen(true);
    }

    function applyChanges() {
        const coordinateSystem = getCoordinateSystem(
            thumbnail,
            getAnnotatorImageSize(annoRef.current, {
                x: image.previewDimensions.width,
                y: image.previewDimensions.height,
            }),
        );
        if (!annoRef.current || !coordinateSystem) {
            throw new Error("Cannot save image map before the image dimensions are available.");
        }
        const annotations = annoRef.current.getAnnotations();
        const result = annotationsToAreas(annotations, areaData, coordinateSystem, areaProperties);
        commit(saveAsJsonString ? JSON.stringify(result) : result);
        setOpen(false);
    }

    return (
        <>
            <Button
                id={id}
                onClick={openEditor}
                className={highlight ? stylex.props(styles.highlight).className : undefined}
            >
                {i18nRegistry.translate(label || "Carbon.Editor.Image:Main:map.edit")}
                {areas.length > 0 && ` (${areas.length})`}
            </Button>
            <Dialog
                open={open}
                setOpen={setOpen}
                modal={false}
                title={i18nRegistry.translate(label || "Carbon.Editor.Image:Main:map.edit")}
                onApply={applyChanges}
                onCancel={() => setOpen(false)}
                showCloseButton
            >
                {open && (
                    <Annotorious>
                        <MapDialogContent
                            image={image}
                            initialAreas={initialAreas}
                            thumbnail={thumbnail}
                            annoRef={annoRef}
                            areaData={areaData}
                            setAreaData={setAreaData}
                            areaProperties={areaProperties}
                            editorsRegistry={editorsRegistry}
                            i18nRegistry={i18nRegistry}
                        />
                    </Annotorious>
                )}
            </Dialog>
        </>
    );
}

export default injectNeosProps(MapEditor, "Map");
