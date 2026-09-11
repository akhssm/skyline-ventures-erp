import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Drives a paginated, filtered, sorted list for one API resource.
 *
 * Handles the parts every module screen would otherwise repeat: debouncing the
 * search box, resetting to page one when a filter changes, ignoring responses
 * from superseded requests, and exposing a refetch for after a mutation.
 */
export const useResource = (resource, options = {}) => {
    const { initialParams = {}, limit = 25, enabled = true } = options;

    const [params, setParams] = useState(initialParams);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState(initialParams.sort || "");

    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit });
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState(null);

    // Incremented per request so a slow earlier response cannot overwrite a
    // faster later one.
    const requestId = useRef(0);

    const query = useMemo(
        () => ({
            ...params,
            page,
            limit,
            ...(sort ? { sort } : {}),
        }),
        [params, page, limit, sort]
    );

    const fetchPage = useCallback(async () => {
        if (!enabled) return;

        const id = ++requestId.current;

        setIsLoading(true);
        setError(null);

        try {
            const response = await resource.list(query);

            if (id !== requestId.current) return;

            setItems(response.data || []);
            setPagination(response.pagination || { page: 1, pages: 1, total: 0, limit });
        } catch (err) {
            if (id !== requestId.current) return;

            setError(err.message);
            setItems([]);
        } finally {
            if (id === requestId.current) setIsLoading(false);
        }
    }, [resource, query, enabled, limit]);

    useEffect(() => {
        fetchPage();
    }, [fetchPage]);

    /** Merges filter values and returns to the first page. */
    const setFilter = useCallback((patch) => {
        setParams((current) => {
            const next = { ...current, ...patch };

            // Empty values are dropped so they never reach the query string.
            Object.keys(next).forEach((key) => {
                if (next[key] === "" || next[key] === null || next[key] === undefined) {
                    delete next[key];
                }
            });

            return next;
        });

        setPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setParams(initialParams);
        setPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Clicking a column header cycles ascending, descending, then off. */
    const toggleSort = useCallback((field) => {
        setSort((current) => {
            if (current === field) return `-${field}`;
            if (current === `-${field}`) return "";
            return field;
        });

        setPage(1);
    }, []);

    return {
        items,
        pagination,
        isLoading,
        error,
        params,
        page,
        sort,
        setPage,
        setFilter,
        clearFilters,
        toggleSort,
        refetch: fetchPage,
    };
};

/** Runs a one-shot request and tracks its loading and error state. */
export const useAsyncData = (loader, deps = [], { enabled = true } = {}) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const requestId = useRef(0);

    const run = useCallback(() => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }

        const id = ++requestId.current;

        setIsLoading(true);
        setError(null);

        loader()
            .then((response) => {
                if (id === requestId.current) setData(response.data ?? response);
            })
            .catch((err) => {
                if (id === requestId.current) setError(err.message);
            })
            .finally(() => {
                if (id === requestId.current) setIsLoading(false);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, ...deps]);

    useEffect(() => {
        run();
    }, [run]);

    return { data, isLoading, error, refetch: run };
};

/**
 * Loads a whole map of lookup lists in one hook.
 *
 * Doing this with one useAsyncData per entry would make the hook count depend
 * on the config, which breaks the moment the router swaps one config for
 * another on the same component. A single hook keeps the count fixed.
 */
export const useLookups = (loaders, deps = []) => {
    const [data, setData] = useState({});

    // The keys are what actually matter; the loader identities change on every
    // render because configs build them inline.
    const keys = Object.keys(loaders).join(",");

    useEffect(() => {
        const entries = Object.entries(loaders);

        if (!entries.length) {
            setData({});
            return;
        }

        let cancelled = false;

        Promise.all(
            entries.map(([key, loader]) =>
                loader()
                    .then((response) => [key, response.data ?? response])
                    .catch(() => [key, []])
            )
        ).then((results) => {
            if (!cancelled) setData(Object.fromEntries(results));
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keys, ...deps]);

    return data;
};

/** Delays a fast-changing value, used by every search input. */
export const useDebounced = (value, delay = 350) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
};
