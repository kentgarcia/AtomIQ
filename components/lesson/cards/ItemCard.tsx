/** Dispatches a bank item to its interaction by type. */

import type {
  ChoiceItemData,
  EstimateItemData,
  FillItemData,
  HotspotItemData,
  Item,
  ItemResponse,
  ItemResult,
  MatchItemData,
  OrderItemData,
  PredictItemData,
  SortItemData,
  TrueOrMythItemData,
} from "@/content/curriculum/types";

import { View } from "react-native";
import { Text } from "@/components/ui/text";

import { Icon } from "@/components/ui/icon";
import { createStyles, fontFaces, fontSizes, radius, spacing, useTheme, withAlpha, type Theme } from "@/theme";

import { MatchItem, OrderItem, SortItem } from "./ArrangeItems";
import type { Rejection } from "./shared";
import { ChoiceItem, PredictChoiceItem, TrueOrMythItem } from "./ChoiceItems";
import { HotspotItem } from "./HotspotItem";
import { EstimateItem, FillItem, PredictEstimateItem } from "./InputItems";

type Hue = "info" | "error" | "primaryLight" | "sky" | "success" | "gold";

/** The title per item type, top-left: what kind of task this is, with its own icon and colour. */
const TITLES: Record<string, { icon: string; label: string; hue: Hue }> = {
  choice: { icon: "Mouse", label: "Pick one", hue: "info" },
  true_or_myth: { icon: "Danger", label: "Myth or fact", hue: "error" },
  order: { icon: "Sort", label: "Put in order", hue: "primaryLight" },
  match: { icon: "Link", label: "Match", hue: "sky" },
  sort: { icon: "Category", label: "Sort", hue: "success" },
  fill: { icon: "Edit", label: "Fill in the blank", hue: "gold" },
  estimate: { icon: "Ruler", label: "Estimate", hue: "sky" },
  hotspot: { icon: "Location", label: "Tap it", hue: "info" },
  predict: { icon: "Flash", label: "Your guess", hue: "primaryLight" },
};

const useStyles = createStyles((theme) => ({
  title: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  tile: { width: 32, height: 32, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  titleText: { ...fontFaces.heavy, fontSize: fontSizes.xl, letterSpacing: 0.6, textTransform: "uppercase", color: theme.colors.text },
}));

/** An icon on a tint of the type's colour, then its name. Not a pill: it is a heading. */
function ItemTitle({ type, theme }: { type: string; theme: Theme }) {
  const styles = useStyles(theme);
  const t = TITLES[type];
  if (!t) return null;
  const c = theme.colors;
  const hue = c[t.hue];
  // Gold is too pale to read as an icon on its own tint, so that icon keeps the text colour
  const ink = t.hue === "gold" ? c.text : hue;
  return (
    <View style={styles.title} accessibilityRole="header">
      <View style={[styles.tile, { backgroundColor: withAlpha(hue, 0.18) }]}>
        <Icon name={t.icon} size={20} color={ink} />
      </View>
      <Text style={styles.titleText}>{t.label}</Text>
    </View>
  );
}

export interface ItemCardProps {
  item: Item;
  /** Unique per card instance in a run: shuffles are stable for it. */
  instanceId: string;
  locked: boolean;
  result: ItemResult | null;
  onChange: (response: ItemResponse | null) => void;
  /** A wrong attempt at a match, order or sort item, which then resets for another try. */
  rejection?: Rejection | null;
  /** A wrong step in a match, which is graded pair by pair. */
  onMiss?: () => void;
}

export function ItemCard(props: ItemCardProps) {
  const { theme } = useTheme();
  return (
    <View style={{ flexGrow: 1, gap: spacing.lg }}>
      {/* The title is simply there (the question and the options still arrive after it) */}
      <View>
        <ItemTitle type={props.item.type} theme={theme} />
      </View>
      <ItemBody {...props} />
    </View>
  );
}

function ItemBody({ item, instanceId, locked, result, onChange, rejection, onMiss }: ItemCardProps) {
  const common = { seed: `${item.id}:${instanceId}`, locked, result, rejection, onMiss, ownerId: `item:${instanceId}` };
  // Each interaction reports a response of its own type, so the cast below is safe.
  const change = onChange as never;
  const data = item.data;
  switch (item.type) {
    case "choice":
      return <ChoiceItem {...common} data={data as unknown as ChoiceItemData} onChange={change} />;
    case "true_or_myth":
      return <TrueOrMythItem {...common} data={data as unknown as TrueOrMythItemData} onChange={change} />;
    case "order":
      return <OrderItem {...common} data={data as unknown as OrderItemData} onChange={change} />;
    case "match":
      return <MatchItem {...common} data={data as unknown as MatchItemData} onChange={change} />;
    case "sort":
      return <SortItem {...common} data={data as unknown as SortItemData} onChange={change} />;
    case "fill":
      return <FillItem {...common} data={data as unknown as FillItemData} onChange={change} />;
    case "estimate":
      return <EstimateItem {...common} data={data as unknown as EstimateItemData} onChange={change} />;
    case "hotspot":
      return <HotspotItem {...common} data={data as unknown as HotspotItemData} onChange={change} />;
    case "predict": {
      const p = data as unknown as PredictItemData;
      return p.input === "estimate" ? (
        <PredictEstimateItem {...common} data={p} onChange={change} />
      ) : (
        <PredictChoiceItem {...common} data={p} onChange={change} />
      );
    }
    default:
      return null;
  }
}
