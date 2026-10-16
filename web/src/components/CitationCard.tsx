import { Box, Typography } from "@mui/material";
import { unitFor } from "../api";
import { useLanguage } from "../i18n";

type Props = {
  law_name: string;
  section_number: string;
  excerpt?: string;
  // Reference number shown before the law name, like a footnote
  index?: number;
  // Optional extras used by the Scan page (already in the reader's language)
  about?: string[];
  explanation?: string;
};

// A plain reference entry. Law names and quoted law text stay in their official English
// so citations stay exact.
export default function CitationCard({ law_name, section_number, excerpt, index, about, explanation }: Props) {
  const { t } = useLanguage();
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 1.5, "& + &": { borderTop: 1, borderColor: "divider" } }}>
      {index !== undefined && (
        <Typography sx={{ color: "text.secondary", fontSize: "0.875rem", fontWeight: 500, minWidth: 18, pt: "1px" }}>
          {index}.
        </Typography>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.4 }}>
          {law_name}
          <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
            {" · "}
            {t(unitFor(law_name))} {section_number}
          </Box>
        </Typography>
        {about && about.length > 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("About:")} {about.join("; ")}
          </Typography>
        )}
        {explanation && (
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            {explanation}
          </Typography>
        )}
        {excerpt && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: 0.75, pl: 1.5, borderLeft: 2, borderColor: "divider", lineHeight: 1.55 }}
          >
            {excerpt}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
