import React, { useState, useEffect, useRef } from "react";
import * as stylex from "@stylexjs/stylex";
import backend from "@neos-project/neos-ui-backend-connector";
import { Button, IconButton, Label, TextInput } from "@neos-project/react-ui-components";
import {
    Annotorious,
    ImageAnnotator,
    ImageAnnotationPopup,
    useAnnotator,
    boundsFromPoints,
    ShapeType,
} from "@annotorious/react";
import { injectNeosProps, getImageIdentity } from "../Helper";
import Dialog from "carbon-neos-editor-styling/Dialog";

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
    imageWrapper: {
        display: "flex",
        justifyContent: "center",
        backgroundColor: "black",
        padding: 13,
    },
    image: {
        display: "block",
        maxWidth: "100%",
    },
    popup: {
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-Half)",
        width: 320,
        padding: "var(--spacing-Half)",
        backgroundColor: "var(--colors-ContrastDarker)",
        color: "var(--colors-ContrastBrightest)",
        boxShadow: "0 0 0 1px var(--colors-ContrastDark), 0 10px 20px #0006",
    },
    popupFooter: {
        display: "flex",
        justifyContent: "end",
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

// Converts a stored image map area (coords in original image space) into an
// annotorious annotation (coords in preview image space)
function areaToAnnotation(area, scalingFactor, index) {
    const coords = (area.chords || "")
        .split(",")
        .map((part) => parseFloat(part) * scalingFactor)
        .filter((number) => !isNaN(number));
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

// Converts annotorious annotations (preview image space) back into image map
// areas (original image space)
function annotationsToAreas(annotations, areaData, scalingFactor) {
    return annotations
        .map((annotation) => {
            const { selector } = annotation.target;
            const scale = (value) => Math.round(value / scalingFactor);
            let shape = null;
            let coords = [];

            if (selector.type === ShapeType.RECTANGLE) {
                const { x, y, w, h } = selector.geometry;
                shape = "rect";
                coords = [x, y, x + w, y + h].map(scale);
            }
            if (selector.type === ShapeType.POLYGON) {
                shape = "poly";
                coords = selector.geometry.points.flat().map(scale);
            }
            if (!shape) {
                return null;
            }

            const data = areaData[annotation.id] || {};
            return {
                shape,
                chords: coords.join(","),
                href: data.href || "",
                alt: data.alt || "",
            };
        })
        .filter(Boolean);
}

function AreaPopup({ annotation, areaData, setAreaData, onDelete, LinkEditor, linkEditorOptions, i18nRegistry }) {
    const data = areaData[annotation.id] || { href: "", alt: "" };
    const update = (partial) =>
        setAreaData((current) => ({
            ...current,
            [annotation.id]: { ...current[annotation.id], ...partial },
        }));

    return (
        <div {...stylex.props(styles.popup)}>
            <Label>{i18nRegistry.translate("Carbon.Editor.Image:Main:map.link")}</Label>
            {LinkEditor ? (
                <LinkEditor
                    identifier={`carbon-map-link-${annotation.id}`}
                    value={data.href}
                    commit={(href) => update({ href })}
                    options={linkEditorOptions}
                />
            ) : (
                <TextInput value={data.href} onChange={(href) => update({ href })} />
            )}
            <Label>{i18nRegistry.translate("Carbon.Editor.Image:Main:map.alt")}</Label>
            <TextInput value={data.alt} onChange={(alt) => update({ alt })} />
            <div {...stylex.props(styles.popupFooter)}>
                <IconButton
                    icon="trash"
                    style="warn"
                    hoverStyle="warn"
                    title={i18nRegistry.translate("Carbon.Editor.Image:Main:map.delete")}
                    onClick={onDelete}
                />
            </div>
        </div>
    );
}

function MapDialogContent({
    image,
    initialAnnotations,
    annoRef,
    areaData,
    setAreaData,
    LinkEditor,
    linkEditorOptions,
    i18nRegistry,
}) {
    const anno = useAnnotator();
    const [tool, setTool] = useState(null);

    useEffect(() => {
        if (!anno) {
            return;
        }
        annoRef.current = anno;
        anno.setAnnotations(initialAnnotations);

        const handleCreate = () => setTool(null);
        anno.on("createAnnotation", handleCreate);

        return () => {
            anno.off("createAnnotation", handleCreate);
            annoRef.current = null;
            anno.destroy();
        };
    }, [anno]);

    function toggleTool(name) {
        setTool((current) => (current === name ? null : name));
    }

    return (
        <div {...stylex.props(styles.content)}>
            <div {...stylex.props(styles.toolbar)}>
                <Button
                    size="small"
                    style={tool === "rectangle" ? "brand" : "lighter"}
                    onClick={() => toggleTool("rectangle")}
                >
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.rectangle")}
                </Button>
                <Button
                    size="small"
                    style={tool === "polygon" ? "brand" : "lighter"}
                    onClick={() => toggleTool("polygon")}
                >
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.polygon")}
                </Button>
                <span {...stylex.props(styles.hint)}>
                    {i18nRegistry.translate("Carbon.Editor.Image:Main:map.hint")}
                </span>
            </div>
            <div {...stylex.props(styles.imageWrapper)}>
                <ImageAnnotator
                    tool={tool || undefined}
                    drawingEnabled={Boolean(tool)}
                    drawingMode={tool === "polygon" ? "click" : "drag"}
                >
                    <img src={image.previewImageResourceUri} alt="" className={stylex.props(styles.image).className} />
                </ImageAnnotator>
            </div>
            <ImageAnnotationPopup
                popup={({ annotation }) => (
                    <AreaPopup
                        annotation={annotation}
                        areaData={areaData}
                        setAreaData={setAreaData}
                        onDelete={() => anno.removeAnnotation(annotation.id)}
                        LinkEditor={LinkEditor}
                        linkEditorOptions={linkEditorOptions}
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
}) {
    const { labelIfEmpty, imageProperty, saveAsJsonString, linkEditor, linkEditorOptions } = { ...config, ...options };
    const [image, setImage] = useState(null);
    const [open, setOpen] = useState(false);
    const [initialAnnotations, setInitialAnnotations] = useState([]);
    const [areaData, setAreaData] = useState({});
    const annoRef = useRef(null);
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

    const scalingFactor = image ? image.previewDimensions.width / image.originalDimensions.width : 1;
    const areas = parseAreas(value);
    const LinkEditor = linkEditor ? editorsRegistry?.get(linkEditor)?.component : null;

    if (!image) {
        if (!labelIfEmpty) {
            return null;
        }
        return i18nRegistry.translate(labelIfEmpty);
    }

    function openEditor() {
        const annotations = [];
        const data = {};
        areas.forEach((area, index) => {
            const annotation = areaToAnnotation(area, scalingFactor, index);
            if (annotation) {
                annotations.push(annotation);
                data[annotation.id] = { href: area.href || "", alt: area.alt || "" };
            }
        });
        setInitialAnnotations(annotations);
        setAreaData(data);
        setOpen(true);
    }

    function applyChanges() {
        const annotations = annoRef.current ? annoRef.current.getAnnotations() : [];
        const result = annotationsToAreas(annotations, areaData, scalingFactor);
        commit(saveAsJsonString ? JSON.stringify(result) : result);
        setOpen(false);
    }

    return (
        <>
            <Button id={id} onClick={openEditor}>
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
            >
                {open && (
                    <Annotorious>
                        <MapDialogContent
                            image={image}
                            initialAnnotations={initialAnnotations}
                            annoRef={annoRef}
                            areaData={areaData}
                            setAreaData={setAreaData}
                            LinkEditor={LinkEditor}
                            linkEditorOptions={linkEditorOptions}
                            i18nRegistry={i18nRegistry}
                        />
                    </Annotorious>
                )}
            </Dialog>
        </>
    );
}

export default injectNeosProps(MapEditor, "Map");
