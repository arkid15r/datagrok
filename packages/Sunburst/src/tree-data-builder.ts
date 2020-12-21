import * as d3 from 'd3';
import {HierarchyNode} from 'd3';
import {BitSet, Column, DataFrame, DOCK_TYPE, GroupByBuilder, JOIN_TYPE} from 'datagrok-api/dg';
import * as grok from 'datagrok-api/grok';

export type TreeData = HierarchyNode<Branch>

type ColorValue = string;
type ColorizationMap = Map<ColumnCategory, ColorValue>

export class BranchProps {
    readonly color?: string;

    constructor(color?: string) {
        this.color = color;
    }
}

export class BranchStats {
    readonly count: number;
    readonly sum: number | undefined;

    constructor(count: number, sum: number | undefined) {
        this.count = count;
        this.sum = sum;
    }
}

export type ColumnCategory = string;

export class Branch {
    readonly category: ColumnCategory;
    readonly children: Map<ColumnCategory, Branch> = new Map();
    properties?: BranchProps;
    statsOverall?: BranchStats;
    statsSelected?: BranchStats;

    constructor(category: ColumnCategory) {
        this.category = category;
        this.children = new Map();
    }

    public traverseTree(mapFn: (branch: Branch, depth: number) => void, currentBranch?: Branch, depth = 0): void {
        if (currentBranch == null) {
            this.traverseTree(mapFn, this, 0);
            return;
        }
        if (currentBranch.children && currentBranch.children.size) {
            for (const branch of currentBranch.children.values()) {
                this.traverseTree(mapFn, branch, depth + 1);
            }
        }
        mapFn(currentBranch, depth);
    }
}

interface GroupByBuilderExt extends GroupByBuilder {
    whereRowMask(bitset: BitSet): GroupByBuilder
}

export class TreeDataBuilder {
    public static COLUMN_NAME_AGG_COUNT = 'sunburst_aggregation_result_count';
    public static COLUMN_NAME_AGG_SUM = 'sunburst_aggregation_result_sum';
    public static AGG_SELECTED_TABLE_NAME = 'selected';

    buildTreeData(
        categoryColumns: Column[],
        valueColumn: Column | undefined,
        dataframe: DataFrame,
        selection: BitSet,
        colors?: ColorValue[]
    ): TreeData {
        const aggOverall = this.aggregate(dataframe, categoryColumns, valueColumn);

        const selectionActive = dataframe.rowCount !== selection.trueCount;
        if (selectionActive) {
            const aggSelected = selectionActive ? this.aggregate(dataframe, categoryColumns, valueColumn, selection) : aggOverall;
            aggSelected.name = TreeDataBuilder.AGG_SELECTED_TABLE_NAME;
            // https://public.datagrok.ai/js/samples/data-frame/join-tables
            // https://datagrok.ai/js-api/Data#joinTables
            // The aggOverall contains merged data
            // The column names for aggSelected get changed to
            // "selected." + theOldAggColumnName
            const columnNames = categoryColumns.map(c => c.name);
            grok.data.joinTables(aggOverall, aggSelected, columnNames, columnNames,
                valueColumn ? [TreeDataBuilder.COLUMN_NAME_AGG_COUNT, TreeDataBuilder.COLUMN_NAME_AGG_SUM] : [TreeDataBuilder.COLUMN_NAME_AGG_COUNT],
                valueColumn ? [TreeDataBuilder.COLUMN_NAME_AGG_COUNT, TreeDataBuilder.COLUMN_NAME_AGG_SUM] : [TreeDataBuilder.COLUMN_NAME_AGG_COUNT],
                JOIN_TYPE.LEFT, true);
        }

        const aggSelectedCountColumnName = TreeDataBuilder.AGG_SELECTED_TABLE_NAME + '.' + TreeDataBuilder.COLUMN_NAME_AGG_COUNT;
        const aggSelectedSumColumnName = TreeDataBuilder.AGG_SELECTED_TABLE_NAME + '.' + TreeDataBuilder.COLUMN_NAME_AGG_SUM;

        const root = new Branch("root");
        for (let rowId = 0; rowId < aggOverall.rowCount; rowId++) {
            let currentBranch = root;
            for (const categoryColumn of categoryColumns) {
                const category = aggOverall.get(categoryColumn.name, rowId);
                if (category === null || category === undefined) {
                    break;
                }

                const existingBranch = currentBranch.children.get(category);
                if (existingBranch) {
                    currentBranch = existingBranch;
                } else {
                    const parent = currentBranch;
                    currentBranch = new Branch(category);
                    parent.children.set(category, currentBranch);
                }
            }

            currentBranch.statsOverall = new BranchStats(
                aggOverall.get(TreeDataBuilder.COLUMN_NAME_AGG_COUNT, rowId),
                valueColumn ? aggOverall.get(TreeDataBuilder.COLUMN_NAME_AGG_SUM, rowId) : undefined
            );

            if (selectionActive) {
                currentBranch.statsSelected = new BranchStats(
                    aggOverall.get(aggSelectedCountColumnName, rowId) || 0,
                    valueColumn ? aggOverall.get(aggSelectedSumColumnName, rowId) || 0 : undefined
                );
            }
        }
        this.recalculateBranchStats(root);
        if (colors) {
            const colorizationMaps = this.generateColorizationMapPerLevel(dataframe, categoryColumns, colors);
            this.colorizeTree(root, colors, colorizationMaps);
        }

        return d3
            .hierarchy(root, x => Array.from(x.children.values()))
            .sum(x => x.children.size ? 1 : x.statsOverall!.count);
    }

    private aggregate(dataframe: DataFrame, categoryColumns: Column[], valueColumn: Column | undefined, selection?: BitSet | undefined) {
        let groupByBuilder: GroupByBuilderExt = dataframe
            .groupBy(categoryColumns.map(c => c.name))
            .count(TreeDataBuilder.COLUMN_NAME_AGG_COUNT) as GroupByBuilderExt;

        if (valueColumn) {
            groupByBuilder = groupByBuilder.sum(valueColumn.name, TreeDataBuilder.COLUMN_NAME_AGG_SUM) as GroupByBuilderExt;
        }

        if (selection) {
            groupByBuilder = groupByBuilder.whereRowMask(selection) as GroupByBuilderExt;
        }

        return groupByBuilder.aggregate();
    }

    private recalculateBranchStats(root: Branch) {
        root.traverseTree(branch => {
            if (!branch || !branch.children || !branch.children.size) {
                return;
            }
            let selectedCountTotal: number | undefined = undefined;
            let overallCountTotal: number | undefined = undefined;
            let selectedSumTotal: number | undefined = undefined;
            let overallSumTotal: number | undefined = undefined;
            for (const childBranch of branch.children.values()) {
                if (childBranch.statsSelected?.count !== undefined) {
                    selectedCountTotal = (selectedCountTotal || 0) + childBranch.statsSelected?.count;
                }
                if (childBranch.statsOverall?.count !== undefined) {
                    overallCountTotal = (overallCountTotal || 0) + childBranch.statsOverall?.count;
                }
                if (childBranch.statsSelected?.sum !== undefined) {
                    selectedSumTotal = (selectedSumTotal || 0) + childBranch.statsSelected?.sum;
                }
                if (childBranch.statsOverall?.sum !== undefined) {
                    overallSumTotal = (overallSumTotal || 0) + childBranch.statsOverall?.sum;
                }
            }
            branch.statsOverall = new BranchStats(overallCountTotal || 0, overallSumTotal);
            if (selectedCountTotal !== undefined) {
                branch.statsSelected = new BranchStats(selectedCountTotal, selectedSumTotal);
            }
        });
    }

    // Color distribution per category per layer
    // Enumerate each layer from beginning of the palette
    private generateColorizationMapPerLevel(dataframe: DataFrame, categoryColumns: Column[], colors: ColorValue[]): ColorizationMap[] {
        return categoryColumns.map(column => {
            const categories = dataframe.getCol(column.name).categories;
            return categories.reduce((map, category, i) => {
                map.set(category, colors[i % colors.length]);
                return map;
            }, new Map() as ColorizationMap);
        });
    }

    // Color distribution per category per layer (alternative)
    // Enumerate each layer from the last color of previous layer
    private generateColorizationMapPerLevel2(dataframe: DataFrame, categoryColumns: Column[], colors: ColorValue[]): ColorizationMap[] {
        let colorIndex = 0;
        return categoryColumns.map(column => {
            const categories = dataframe.getCol(column.name).categories;
            return categories.reduce((map, category) => {
                map.set(category, colors[colorIndex]);
                colorIndex = (colorIndex + 1) % colors.length
                return map;
            }, new Map() as ColorizationMap);
        });
    }

    // Assign colors to the tree elements
    private colorizeTree(root: Branch, colors: string[], maps: ColorizationMap[]): void {
        root.traverseTree((branch, depth) => {
            if (!depth) {
                return;
            }
            branch.properties = new BranchProps(maps[depth - 1].get(branch.category))
        })
    }
}
