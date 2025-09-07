import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

// Tracks latest reading per deviceid
export function useRealtimeReadings(deviceIds = []) {
    const [latestByDevice, setLatestByDevice] = useState({})

    // Seed with latest reading per device on mount/ids change
    useEffect(() => {
        let cancelled = false
        async function loadLatest() {
            if (!deviceIds.length) return
            const ids = [...new Set(deviceIds)]
            // Fetch latest per device via one query each (simple, readable)
            const fetches = ids.map(async (id) => {
                const { data, error } = await supabase
                    .from('readings')
                    .select('deviceid, weight_g, created_at')
                    .eq('deviceid', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
                console.log(`Reading for ${id}:`, data, error)
                return !error && data ? data : null
            })
            const rows = await Promise.all(fetches)
            if (cancelled) return
            const next = {}
            rows.forEach((r) => {
                if (r && r.deviceid) next[r.deviceid] = r
            })
            setLatestByDevice((prev) => ({ ...prev, ...next }))
        }
        loadLatest()
        return () => {
            cancelled = true
        }
    }, [deviceIds.join('|')])

    // Subscribe to realtime inserts
    useEffect(() => {
        const channel = supabase
            .channel('readings-inserts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, (payload) => {
                console.log('Realtime event received:', payload)
                const row = payload.new
                if (!row?.deviceid) return
                setLatestByDevice((prev) => {
                    const prevTs = prev[row.deviceid]?.created_at ? new Date(prev[row.deviceid].created_at).getTime() : 0
                    const newTs = row.created_at ? new Date(row.created_at).getTime() : Date.now()
                    if (newTs >= prevTs) {
                        return { ...prev, [row.deviceid]: row }
                    }
                    return prev
                })
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    return useMemo(() => latestByDevice, [latestByDevice])
}


