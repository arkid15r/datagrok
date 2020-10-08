import * as d3 from "d3";
import {TreeData, Branch} from './tree-data-builder';

interface Rectangle {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    data: Branch;
}

export type ClickHandler = (rowIds: string[]) => void;

export class SunburstRenderer {

    private readonly format = d3.format("~r");

    constructor(private readonly colors: string[],
                private readonly clickHandler: ClickHandler) {
    }

    private static shade(d: TreeData) {
        return 0.1 + 0.5 / Math.pow(2, d.depth - 1);
    }

    private static sameBranch(target: TreeData, d: TreeData) {
        do {
            if (d === target) {
                return true;
            }
            target = target.parent!;
        } while (target != null);
        return false;
    }

    public render(htmlElement: HTMLElement, data: TreeData, width: number, height: number) {
        htmlElement.innerHTML = '';
        htmlElement.appendChild(this.createSvg(data, width, height));
    }

    private partitionLayout(data: TreeData, radius: number) {
        return d3.partition<Branch>()
            .size([2 * Math.PI, radius])
            (data.sort((a, b) => b.value! - a.value!))
    }

    private arc(radius: number) {
        return d3.arc<Rectangle>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => d.y1 - 1);
    }

    private arcSelection(radius: number) {
        return d3.arc<Rectangle>()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(radius / 2)
            .innerRadius(d => d.y0)
            .outerRadius(d => {
                const leavesTotal = d.data.statsOverall?.count || 0;
                const leavesSelected = d.data.statsSelected?.count || 0;
                const ratio = leavesTotal == 0 ? 0 : 1 - leavesSelected / leavesTotal;
                return d.y1 - 1 - (d.y1 - 1 - d.y0) * ratio;
            });
    }

    private createSvg(data: TreeData, width: number, height: number) {
        const center = Math.min(width, height) / 2;
        const radius = center * 0.9;

        const root = this.partitionLayout(data, radius);
        const elements = root.descendants().filter(d => d.depth);

        const svg = d3.create("svg");

        // Selection (partial) segments
        svg.append("g")
            .selectAll("path")
            .data(elements)
            .join("path")
            .attr("fill", this.defaultSegmentFill(root))
            .attr("fill-opacity", SunburstRenderer.shade)
            .attr("d", this.arcSelection(radius))
        ;

        // Sunburst segments
        const segment = svg.append("g")
            .selectAll("path")
            .data(elements)
            .join("path")
            .attr("fill", this.defaultSegmentFill(root))
            .attr("fill-opacity", SunburstRenderer.shade)
            .attr("d", this.arc(radius))
        ;

        segment.on("click", this.onClick)
            .on("mouseover", target => {
                segment.attr("fill-opacity", d => {
                    return SunburstRenderer.sameBranch(target, d) ? 0.8 : SunburstRenderer.shade(d);
                });
            })
            .on("mouseleave", target => {
                segment.attr("fill-opacity", SunburstRenderer.shade);
            })
            .append("title")
            .text(this.getTooltipText);

        svg.append("g")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-family", "sans-serif")
            .selectAll("text")
            .data(root.descendants().filter(d => d.depth && (d.y0 + d.y1) / 2 * (d.x1 - d.x0) > 10))
            .join("text")
            .attr("transform", function (d) {
                const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
                const y = (d.y0 + d.y1) / 2;
                return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
            })
            .attr("dy", "0.35em")
            .text((d) => d.data.category);

        return svg.attr("viewBox", `-${center} -${center} ${width} ${height}`).node()!;
    }

    private getTooltipText = (d: TreeData): string => {
        const selectedCount = d.data.statsSelected?.count || 0;
        const selectedSum = d.data.statsSelected?.sum || 0;
        const overallCount = d.data.statsOverall?.count || 0;
        const overallSum = d.data.statsOverall?.sum || 0;
        const itemPath = this.getCategories(d).join("/");
        const selectedCountStr = d.data.statsSelected?.count !== undefined
            ?  this.format(selectedCount) + ' / '
            : '';

        let tooltipText = `${itemPath}\n` +
            `count: ${selectedCountStr}${this.format(overallCount)}\n`
        if (d.data.statsOverall?.sum === undefined) {
            return tooltipText;
        }

        // If value column is selected
        const selectedSumStr = d.data.statsSelected?.count !== undefined
            ? this.format(selectedSum) + ' / '
            : '';
        const selectedAvgStr = d.data.statsSelected?.count !== undefined
            ? this.format(selectedSum / selectedCount) + ' / '
            : '';
        tooltipText += `sum:    ${selectedSumStr}${this.format(overallSum)} \n` +
            `avg:     ${selectedAvgStr}${this.format(overallSum / overallCount)}`;
        return tooltipText;
    }

    private getCategories = (d: TreeData): string[] => {
        return d.ancestors().map(d => d.data.category).reverse().filter((v, i) => !!i);
    }

    private onClick = (d: TreeData) => {
        this.clickHandler(this.getCategories(d));
    }

    private defaultSegmentFill(root: TreeData) {
        const color = d3.scaleOrdinal(this.colors.slice(0, (root.children?.length || 0) + 1));

        return (d: TreeData) => {
            let v: typeof d | null = d;
            while (!!v && v.depth > 1) v = v.parent;
            return color(v?.data?.category || '');
        }
    }
}
