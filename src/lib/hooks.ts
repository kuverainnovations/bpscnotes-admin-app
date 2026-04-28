'use client'
import { useState, useEffect, useCallback } from 'react'

// ── Generic fetch hook ────────────────────────────────────────
// Backend returns: { success, data: { ... }, meta, timestamp }
// We store res.data so pages can do: data?.quizzes, data?.admins etc.
export function useApiData<T>(
  fetcher: () => Promise<any>,
  deps: any[] = []
) {
  const [data, setData]         = useState<T | null>(null)
  const [meta, setMeta]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetcher()
      // Store res.data so pages can read data?.quizzes, data?.notes, etc.
      setData(res?.data ?? null)
      setMeta(res?.meta ?? null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { load() }, [load])

  return { data, meta, loading, error, refetch: load }
}

// ── Mutation hook ─────────────────────────────────────────────
export function useMutation<T = any>(
  mutator: (...args: any[]) => Promise<any>,
  options?: {
    onSuccess?: (data: any, args?: any[]) => void
    onError?:   (msg: string) => void
  }
) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const mutate = async (...args: any[]) => {
    setLoading(true)
    setError(null)
    try {
      const res = await mutator(...args)
      options?.onSuccess?.(res?.data, args)
      return res
    } catch (err: any) {
      const msg = err?.message || 'Operation failed'
      setError(msg)
      options?.onError?.(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

// ── Paginated fetch hook ──────────────────────────────────────
export function usePaginatedData<T>(
  fetcher: (params: any) => Promise<any>,
  initialParams: Record<string, any> = {}
) {
  const [data, setData]       = useState<T[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [params, setParams]   = useState({ page: 1, limit: 20, ...initialParams })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetcher(params)
      if (res?.data) {
        const firstArray = Object.values(res.data).find(v => Array.isArray(v))
        setData((firstArray as T[]) || [])
      }
      setTotal(res?.meta?.total || 0)
    } catch (err: any) {
      setError(err?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [params]) // eslint-disable-line

  useEffect(() => { load() }, [load])

  const updateParams = (newParams: Partial<typeof params>) =>
    setParams(p => ({ ...p, ...newParams, page: newParams.page ?? 1 }))

  return { data, total, loading, error, params, updateParams, refetch: load }
}
