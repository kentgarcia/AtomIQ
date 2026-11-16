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

import { CardBadge } from "@/components/lesson/CardBadge";
import { useLessonTeacher } from "@/components/lesson/Conversation";
import { spacing } from "@/theme";

import { MatchItem, OrderItem, SortItem } from "./ArrangeItems";
import { ChoiceItem, PredictChoiceItem, TrueOrMythItem } from "./ChoiceItems";
import { HotspotItem } from "./HotspotItem";
import { EstimateItem, FillItem, PredictEstimateItem } from "./InputItems";

/** The eyebrow badge per item type: what kind of task this is. */
const BADGES: Record<string, { icon: string; label: string }> = {
  choice: { icon: "Mouse", label: "Pick one" },
  true_or_myth: { icon: "Danger", label: "Myth or fact" },
  order: { icon: "Sort", label: "Put in order" },
  match: { icon: "Link", label: "Match" },
  sort: { icon: "Category", label: "Sort" },
  fill: { icon: "Edit", label: "Fill in" },
  estimate: { icon: "Ruler", label: "Estimate" },
  hotspot: { icon: "Location", label: "Tap it" },
  predict: { icon: "Flash", label: "Your guess" },
};

export interface ItemCardProps {
  item: Item;
  /** Unique per card instance in a run: shuffles are stable for it. */
  instanceId: string;
  locked: boolean;
  result: ItemResult | null;
  onChange: (response: ItemResponse | null) => void;
}

export function ItemCard(props: ItemCardProps) {
  const badge = BADGES[props.item.type];
  const teacher = useLessonTeacher();
  return (
    <View style={{ flexGrow: 1, gap: spacing.lg }}>
      {/* With a teacher the question is asked in their bubble, and the hint says how to answer, so the badge is dropped. */}
      {badge && !teacher ? <CardBadge icon={badge.icon} label={badge.label} /> : null}
      <ItemBody {...props} />
    </View>
  );
}

function ItemBody({ item, instanceId, locked, result, onChange }: ItemCardProps) {
  const common = { seed: `${item.id}:${instanceId}`, locked, result, ownerId: `item:${instanceId}` };
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
