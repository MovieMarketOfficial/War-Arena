import { useQuery } from "@tanstack/react-query";

interface NationRank {
  nationId: number;
  rank: number;
  total: number;
  percentile: string;
}

export function useNationRank(nationId: number | undefined) {
  return useQuery<NationRank>({
    queryKey: ["nation-rank", nationId],
    queryFn: async () => {
      const res = await fetch(`/api/nations/${nationId}/rank`);
      if (!res.ok) throw new Error("Failed to fetch rank");
      return res.json();
    },
    enabled: !!nationId,
  });
}
