import manifest from "@neos-project/neos-ui-extensibility";
import React, { Suspense, lazy } from "react";
import LoadingAnimation from "carbon-neos-loadinganimation/LoadingWithStyleX";
import "@lemoncode/react-image-focal-point/style.css";
import "@annotorious/react/annotorious-react.css";

const editors = {
    FocalPoint: () => import("./FocalPoint"),
    Map: () => import("./Map"),
};

function generateLazyEditor(name) {
    const LazyEditor = lazy(editors[name]);
    return (props) => (
        <Suspense fallback={<LoadingAnimation isLoading={true} />}>
            <LazyEditor {...props} />
        </Suspense>
    );
}

const keys = Object.keys(editors);
const loaded = keys.map((key) => generateLazyEditor(key));

manifest("Carbon.Editor.Image:Editors", {}, (globalRegistry) => {
    const editorsRegistry = globalRegistry.get("inspector").get("editors");

    keys.forEach((key, index) => {
        editorsRegistry.set(`Carbon.Editor.Image/${key}`, {
            component: loaded[index],
            hasOwnLabel: true,
        });
    });
});
