import { IEditable, DataSourceState, IDataSourceView } from '../../../types';
import { ArrayListView, BaseArrayListViewProps } from './ArrayListView';
import { NOT_FOUND_RECORD } from './tree';

export interface AsyncListViewProps<TItem, TId, TFilter> extends BaseArrayListViewProps<TItem, TId, TFilter> {
    /** A function to retrieve the data, asynchronously. This function usually performs a REST API call.
     * Should return the array of items, which will be processed by dataSource.
     * This api called only once during the initialization and assumed to return the full amount of data.
     * For lazy loading cases, use LazyDataSource
     * */
    api(): Promise<TItem[]>;
}

export class AsyncListView<TItem, TId, TFilter = any> extends ArrayListView<TItem, TId, TFilter> implements IDataSourceView<TItem, TId, TFilter> {
    private isloading: boolean = false;
    private isloaded: boolean = false;
    constructor(protected editable: IEditable<DataSourceState<TFilter, TId>>, protected props: AsyncListViewProps<TItem, TId, TFilter>) {
        super(editable, props);
        this.props = props;
        this.update(editable, props);
    }

    public async loadData() {
        if (this.isLoaded || this.isLoading) {
            return;
        }

        this.isLoading = true;
        return this.props.api().then((items) => {
            this.isLoaded = true;
            this.isLoading = false;
            this.update({ value: this.value, onValueChange: this.onValueChange }, { ...this.props, items });
            this.isReloading = false;

            // While react 18 without concurrent mode, current force setState calls rerender immidiately
            // without updated items in AsyncDataSource, which provides an old link to views with old trees.
            // To prevent such a behavior, it is required to put a force update to the macrotask queue to be executed
            // after the current Promise.
            setTimeout(() => this._forceUpdate(), 0);

            return items;
        });
    }

    public reload = () => {
        this.isLoading = false;
        this.isLoaded = false;
        super.reload();
    };

    public getVisibleRows = () => {
        const from = this.value.topIndex;
        const count = this.value.visibleCount;
        const rows = [];
        if (!this.isLoaded) {
            while (rows.length < count) {
                const index = from + rows.length;
                const row = this.getLoadingRow('_loading_' + index, index);
                rows.push(row);
            }
            return rows;
        }

        const visibleRows = this.rows.slice(this.value.topIndex, this.getLastRecordIndex());
        return this.getRowsWithPinned(visibleRows);
    };

    public getListProps = () => {
        if (!this.isLoaded) {
            return {
                rowsCount: this.value.visibleCount,
                knownRowsCount: this.value.visibleCount,
                exactRowsCount: this.value.visibleCount,
                totalCount: this.value.visibleCount,
                selectAll: this.selectAll,
                isReloading: this.isReloading,
            };
        }

        return {
            rowsCount: this.rows.length,
            knownRowsCount: this.rows.length,
            exactRowsCount: this.rows.length,
            totalCount: this.fullTree?.getTotalRecursiveCount(),
            selectAll: this.selectAll,
            isReloading: this.isReloading,
        };
    };

    public getById = (id: TId, index: number) => {
        if (this.isLoading && !this.isLoaded) {
            return this.getLoadingRow('_loading_' + id, index, []);
        }

        // if originalTree is not created, but blank tree is defined, get item from it
        const item = (this.fullTree ?? this.visibleTree).getById(id);

        if (item === NOT_FOUND_RECORD) {
            return this.getUnknownRow(id, index, []);
        }

        return this.getRowProps(item, index);
    };

    get isLoading(): boolean {
        return this.isloading;
    }

    set isLoading(isLoading: boolean) {
        this.isloading = isLoading;
    }

    get isLoaded(): boolean {
        return this.isloaded;
    }

    set isLoaded(isloaded: boolean) {
        this.isloaded = isloaded;
    }
}
