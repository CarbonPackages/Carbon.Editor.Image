import React, { useLayoutEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { getThumbnailCustomProperties } from "./Thumbnail";

const styles = stylex.create({
    wrapper: {
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignSelf: "center",
        flexShrink: 0,
        width: "fit-content",
        backgroundColor: "black",
        padding: 13,
        overflow: "hidden",
    },
    // Measure dialog constraints without letting the preview's size affect them.
    limits: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "max(1px, calc(var(--dialog-max-width) - 40px - 26px))",
        height: "max(1px, calc(var(--dialog-max-height) - 130px - 26px))",
        visibility: "hidden",
        pointerEvents: "none",
    },
});

export default function ImagePreview({ thumbnail, children }) {
    const limitsRef = useRef(null);
    const [limits, setLimits] = useState(null);

    useLayoutEffect(() => {
        const element = limitsRef.current;
        const updateLimits = () => {
            if (element.clientWidth > 0 && element.clientHeight > 0) {
                setLimits({ width: element.clientWidth, height: element.clientHeight });
            }
        };
        const observer = new ResizeObserver(updateLimits);
        observer.observe(element);
        updateLimits();
        return () => observer.disconnect();
    }, []);

    const props = stylex.props(styles.wrapper);
    return (
        <div
            {...props}
            style={{
                ...props.style,
                ...getThumbnailCustomProperties(thumbnail, limits?.width, limits?.height),
            }}
        >
            <div ref={limitsRef} aria-hidden="true" {...stylex.props(styles.limits)} />
            {limits && children}
        </div>
    );
}
