import { readFileAsString } from "./utils.js";

function createDataSet(spanItems) {
    // index by id
    for (const t of spanItems) {
        spansById.set(t.id, t);
    }

    // link parent and child objects
    for (const [_, t] of spansById.entries()) {
        t.children = new Array();
        t.parent = spansById.get(t.parentId);
    }

    for (const [_, t] of spansById.entries()) {
        const parent = spansById.get(t.parentId);
        if (parent != null) {
            parent.children.push(t);
        }
    }

    for (const [_, t] of spansById.entries()) {
        t.children = t.children.sort((a, b) => a - b);
    }


    // fill root level
    const roots = []
    for (const [_, t] of spansById.entries()) {
        if (t.parent === undefined) {
            roots.push(t);
        }
    }
    const data = {
        "id": "root",
        "name": "root",
        "value": 0,
        "children": []
    };
    for (const item of roots) {
        data.children.push(handleItem(item));
    }

    return data;
}

function handleItem(item) {
    const childData = [];
    for (let child of item.children) {
        childData.push(handleItem(child));
    }

    return {
        id: item.id,
        name: `${item.name}`,
        value: item.duration,
        service_label: item.destination?.service?.label,
        endpoint_label: item.destination?.endpoint?.label,
        endpoint_type: item.destination?.endpoint?.type,
        children: childData
    }
}

function search() {
    const term = document.getElementById("term").value;

    if (chart !== undefined) {
        chart.search(term);
    }
}

function clear() {
    document.getElementById("term").value = "";

    if (chart !== undefined) {
        chart.clear();
    }
}

function resetZoom() {
    if (chart !== undefined) {
        chart.resetZoom();
    }
}

function onClick(d) {
    console.info("Clicked on " + d.data.name);
}

function searchMatch(span, term) {
    if (!term) {
        return false;
    }

    let label = span.data.name;
    if (document.getElementById("ignorecase").checked) {
        term = term.toLowerCase()
        label = label.toLowerCase()
    }

    const re = new RegExp(term);
    return typeof label !== 'undefined' && label && label.match(re);
}

const spansById = new Map();
const fileSelector = document.getElementById("fileselector");
var chart;
const chartDetails = document.getElementById("details");

async function readFiles(files) {
    let spanItems = [];
    spansById.clear();

    // process file contents
    for (const file of files) {
        let content = await readFileAsString(file);
        const spans = JSON.parse(content);
        spanItems = spanItems.concat(spans.items);
    }

    let dataset = createDataSet(spanItems);

    chart = flamegraph()
        .width(1500)
        .cellHeight(18)
        .transitionDuration(250)
        .minFrameSize(0)
        .transitionEase(d3.easeCubic)
        .sort(true)
        .onClick(onClick)
        .selfValue(false);
    chart.setDetailsElement(chartDetails);
    chart.setSearchMatch(searchMatch);

    var tip = flamegraph.tooltip.defaultFlamegraphTooltip()
        .html(function (d) {
            return `<b>id</b>: ${d.data.id}<br><b>name</b>: ${d.data.name}<br><b>duration</b>: ${d.data.value}<br><b>service label</b>: ${d.data.service_label !== undefined ? d.data.service_label : "-"}<br><b>endpoint label</b>: ${d.data.endpoint_label !== undefined ? d.data.endpoint_label : "-"}<br><b>endpoint type</b>: ${d.data.endpoint_type !== undefined ? d.data.endpoint_type : "-"}`;
        });
    chart.tooltip(tip);

    d3.select("#chart")
        .datum(dataset)
        .call(chart);
}

// file uploaded
fileSelector.value = null;
fileSelector.addEventListener("change", (event) => {
    chart = undefined;
    document.getElementById("chart").innerHTML = "";
    readFiles(event.target.files);
});

document.getElementById("form").addEventListener("submit", function (event) {
    event.preventDefault();
    search();
});

document.getElementById("search").addEventListener("click", search);
document.getElementById("clear").addEventListener("click", clear);
document.getElementById("reset").addEventListener("click", resetZoom);
