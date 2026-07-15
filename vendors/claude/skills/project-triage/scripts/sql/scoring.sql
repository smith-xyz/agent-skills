-- Scoring query: computes deterministic base scores for open issues.
-- Formula: reaction_count * 2 + comment_count + severity_mult + driver_breadth
--   severity_mult: critical=10, high=7, medium=4, low=1
--   driver_breadth: if issue has >1 driver:* label, add 3

SELECT
  i.number,
  i.title,
  i.reaction_count,
  i.comment_count,
  COALESCE(sev.multiplier, 0) AS severity_mult,
  CASE WHEN driver_count.cnt > 1 THEN 3 ELSE 0 END AS driver_breadth,
  (
    i.reaction_count * 2
    + i.comment_count
    + COALESCE(sev.multiplier, 0)
    + CASE WHEN driver_count.cnt > 1 THEN 3 ELSE 0 END
  ) AS base_score
FROM issues i
LEFT JOIN (
  SELECT
    il.issue_number,
    MAX(
      CASE il.label
        WHEN 'priority:critical' THEN 10
        WHEN 'priority:high' THEN 7
        WHEN 'priority:medium' THEN 4
        WHEN 'priority:low' THEN 1
        ELSE 0
      END
    ) AS multiplier
  FROM issue_labels il
  WHERE il.label LIKE 'priority:%'
  GROUP BY il.issue_number
) sev ON sev.issue_number = i.number
LEFT JOIN (
  SELECT issue_number, COUNT(*) AS cnt
  FROM issue_labels
  WHERE label LIKE 'driver:%'
  GROUP BY issue_number
) driver_count ON driver_count.issue_number = i.number
WHERE i.state = 'open'
ORDER BY base_score DESC;
