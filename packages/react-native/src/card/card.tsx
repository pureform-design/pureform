// The card: a surface for its content. With `onPress`, the whole card acts: it's interactive,
// lifts on hover, ripples when pressed, and renders its touch target. Beside other controls (its
// actions, a header action), its action goes on the action area instead, a pressable around the
// media, header, and content, so each control stays reachable on its own; the container then
// shows the action area's states and ripple.

import { cardAnatomy } from "@pureform/anatomy";
import type { IndicationAnatomy, TestIdOverride } from "@pureform/anatomy";
import { cardLayout, cardSelection, isPresent } from "@pureform/binding-core";
import type {
  CardContentProps,
  CardPart,
  CardVariantProps,
  InteractiveProps,
} from "@pureform/binding-core";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { resolveText } from "../resolve-text";

import { useSurfaceIndication } from "../indication";
import type { SurfaceIndicationScope } from "../indication";
import { testIdOf, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { PartSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";
import type { ComponentSlots } from "../styles";

const [ROOT_ENTRY, ACTION_AREA_ENTRY] = cardAnatomy.indication as readonly [
  IndicationAnatomy,
  IndicationAnatomy,
];

/** What Root shares with its parts. */
interface CardContextValue {
  readonly slots: ComponentSlots<CardPart>;
  readonly indication: SurfaceIndicationScope;
  readonly disabled: boolean;
  readonly testId: TestIdOverride<CardPart> | undefined;
  readonly slot: PartSlots;
  /** Tells Root an action area is there, while it's mounted. */
  readonly hasActionArea: (present: boolean) => void;
}

const CardContext = createContext<CardContextValue | undefined>(undefined);

const useCard = (part: string): CardContextValue => {
  const card = useContext(CardContext);
  if (!card) throw new Error(`Card.${part} must be inside Card.Root`);
  return card;
};

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface CardRootHosts {
  readonly root: "View";
  readonly touchTarget: "View";
  readonly actionArea: "Pressable";
  readonly media: "View";
  readonly header: "View";
  readonly avatar: "View";
  readonly headerText: "View";
  readonly headline: "Text";
  readonly subhead: "Text";
  readonly headerAction: "View";
  readonly content: "View";
  readonly supportingText: "Text";
  readonly actions: "View";
  readonly footer: "View";
}

export interface CardRootProps
  extends CardVariantProps, InteractiveProps, NativeSlotProps<CardRootHosts> {
  readonly children?: ReactNode;
  /** Makes the whole card act: one button, its text its label. Use the action area instead
   *  when the card has other controls. */
  readonly onPress?: (() => void) | undefined;
  /** Dims a card that acts; the action area takes it as its default. */
  readonly disabled?: boolean | undefined;
  readonly testId?: TestIdOverride<CardPart> | undefined;
}

function Root(props: CardRootProps): ReactNode {
  const acts = props.onPress !== undefined;
  const [hasArea, setHasArea] = useState(false);
  const indication = useSurfaceIndication(
    acts ? ROOT_ENTRY : ACTION_AREA_ENTRY,
    {
      indication: props.indication,
      interactionSource: props.interactionSource,
      disabled: props.disabled,
      interactive: acts || hasArea,
    },
  );
  const slots = useComponentSlots<CardPart>(
    "card",
    indication.select(cardSelection(props, acts ? "button" : "div")),
    acts || hasArea
      ? indication.states(props.disabled ? { disabled: true } : {})
      : {},
  );
  const { styles: s, selected, views: v } = slots;
  const id = (part: CardPart) => testIdOf(cardAnatomy, part, props.testId);
  const slot = nativeSlots(props);
  const value: CardContextValue = {
    slots,
    indication,
    disabled: !!props.disabled,
    testId: props.testId,
    slot,
    hasActionArea: setHasArea,
  };
  if (!acts) {
    // Not a grouping element: what's inside stays reachable on its own.
    return (
      <CardContext value={value}>
        <v.root.View
          {...slot.props("root")}
          style={slot.style("root", s.root)}
          testID={id("root")}
        >
          {props.children}
          {hasArea ? indication.layer(selected) : null}
        </v.root.View>
      </CardContext>
    );
  }
  return (
    <CardContext value={value}>
      <v.root.Pressable
        {...slot.props("root")}
        {...slot.with("root", indication.handlers)}
        role="button"
        disabled={props.disabled}
        onPress={slot.on("root", "onPress", props.onPress)}
        style={slot.style("root", withUnselectable(s.root))}
        testID={id("root")}
      >
        <v.touchTarget.View
          {...slot.props("touchTarget")}
          pointerEvents="none"
          style={slot.style("touchTarget", s.touchTarget)}
          testID={id("touchTarget")}
        />
        {props.children}
        {indication.layer(selected)}
      </v.root.Pressable>
    </CardContext>
  );
}

export interface CardActionAreaProps {
  readonly children?: ReactNode;
  readonly onPress?: (() => void) | undefined;
  /** Follows Root's unless given. */
  readonly disabled?: boolean | undefined;
  /** `"button"`, or `"link"` for one that leads somewhere. */
  readonly role?: "button" | "link" | undefined;
  /** Its label, when its text isn't the right one. */
  readonly "aria-label"?: string | undefined;
}

/** The card's own action beside its other controls: a pressable around the media, header, and
 *  content, one element for assistive technology, its text its label. Keep every other control
 *  outside it. The container shows its hover, press, and focus, and its ripple. */
function ActionArea(props: CardActionAreaProps): ReactNode {
  const card = useCard("ActionArea");
  const slot = card.slot;
  const { hasActionArea } = card;
  useLayoutEffect(() => {
    hasActionArea(true);
    return () => hasActionArea(false);
  }, [hasActionArea]);
  const { styles: s, views: v } = card.slots;
  const disabled = props.disabled ?? card.disabled;
  return (
    <v.actionArea.Pressable
      {...slot.props("actionArea")}
      {...slot.with("actionArea", card.indication.handlers)}
      role={props.role ?? "button"}
      {...(props["aria-label"] === undefined
        ? {}
        : { "aria-label": props["aria-label"] })}
      disabled={disabled}
      onPress={slot.on("actionArea", "onPress", props.onPress)}
      style={slot.style("actionArea", withUnselectable(s.actionArea))}
      testID={testIdOf(cardAnatomy, "actionArea", card.testId)}
    >
      {props.children}
    </v.actionArea.Pressable>
  );
}

/** A section's props. */
export interface CardPartProps {
  readonly children?: ReactNode;
}

// A view part; a string inside is drawn as text in `text`'s style, as a View can't hold one.
const viewPart = (name: CardPart, label: string, text?: CardPart) =>
  function CardViewPart(props: CardPartProps): ReactNode {
    const card = useCard(label);
    const slot = card.slot;
    const { styles: s, views: v } = card.slots;
    const Slot = v[name];
    const children = resolveText(
      props.children,
      Slot,
      text ? s[text] : undefined,
    );
    return (
      <Slot.View
        {...slot.props(name)}
        style={slot.style(name, s[name])}
        testID={testIdOf(cardAnatomy, name, card.testId)}
      >
        {children}
      </Slot.View>
    );
  };

const textPart = (name: CardPart, label: string) =>
  function CardTextPart(props: CardPartProps): ReactNode {
    const card = useCard(label);
    const slot = card.slot;
    const { styles: s, views: v } = card.slots;
    const Slot = v[name];
    return (
      <Slot.Text
        {...slot.props(name)}
        selectable={false}
        style={slot.style(name, s[name])}
        testID={testIdOf(cardAnatomy, name, card.testId)}
      >
        {props.children}
      </Slot.Text>
    );
  };

/** A picture or video at the card's top, full bleed. */
const Media = viewPart("media", "Media");
/** The header's row: the avatar, the text, and an action. */
const Header = viewPart("header", "Header");
/** An avatar or icon before the headline. */
const Avatar = viewPart("avatar", "Avatar");
/** The headline and subhead. */
const HeaderText = viewPart("headerText", "HeaderText");
/** The card's title. */
const Headline = textPart("headline", "Headline");
/** A line under the headline. */
const Subhead = textPart("subhead", "Subhead");
/** A control at the header's end, outside the action area. */
const HeaderAction = viewPart("headerAction", "HeaderAction");
/** The card's body, padded: the supporting text, and anything else. */
const Content = viewPart("content", "Content", "supportingText");
/** Material's supporting text. */
const SupportingText = textPart("supportingText", "SupportingText");
/** A row of buttons. */
const Actions = viewPart("actions", "Actions");
/** A last section, under the actions. */
const Footer = viewPart("footer", "Footer", "supportingText");

export interface CardProps extends CardRootProps, CardContentProps<ReactNode> {}

/** The ready-made card. Given any section (`headline`, `media`, …), it lays them out as Material
 *  does, and Root's padding gives way to theirs unless `padded` is given. With `onPress`, the
 *  whole card is one button; with `actions` or a `headerAction` too, `onPress` moves to an action
 *  area around the media, header, and content, so each control stays its own. */
function CardImpl(props: CardProps): ReactNode {
  const acts = props.onPress !== undefined;
  const layout = cardLayout(props, acts ? "button" : "div");
  const padded = props.padded ?? (layout.sections ? false : undefined);
  const header = layout.header ? (
    <Header>
      {isPresent(props.avatar) ? <Avatar>{props.avatar}</Avatar> : null}
      <HeaderText>
        {isPresent(props.headline) ? (
          <Headline>{props.headline}</Headline>
        ) : null}
        {isPresent(props.subhead) ? <Subhead>{props.subhead}</Subhead> : null}
      </HeaderText>
      {isPresent(props.headerAction) ? (
        <HeaderAction>{props.headerAction}</HeaderAction>
      ) : null}
    </Header>
  ) : null;
  const body = (
    <>
      {isPresent(props.media) ? <Media>{props.media}</Media> : null}
      {layout.headerOutside ? null : header}
      {!layout.sections ? (
        props.children
      ) : layout.supportingText || isPresent(props.children) ? (
        <Content>
          {layout.supportingText ? (
            <SupportingText>{props.supportingText}</SupportingText>
          ) : null}
          {props.children}
        </Content>
      ) : null}
    </>
  );
  const rest = (
    <>
      {isPresent(props.actions) ? <Actions>{props.actions}</Actions> : null}
      {isPresent(props.footer) ? <Footer>{props.footer}</Footer> : null}
    </>
  );
  const root = {
    variant: props.variant,
    padded,
    actionsAlign: props.actionsAlign,
    tokens: props.tokens,
    indication: props.indication,
    interactionSource: props.interactionSource,
    testId: props.testId,
    style: props.style,
    slotProps: props.slotProps,
  };
  if (!layout.actionArea) {
    return (
      <Root
        {...root}
        interactive={props.interactive}
        disabled={props.disabled}
        onPress={props.onPress}
      >
        {body}
        {rest}
      </Root>
    );
  }
  return (
    <Root {...root}>
      {layout.headerOutside ? header : null}
      <ActionArea onPress={props.onPress} disabled={props.disabled}>
        {body}
      </ActionArea>
      {rest}
    </Root>
  );
}

/** Material's card: `<Card variant="filled">…</Card>`, `<Card onPress={open} headline="Plan"
 *  supportingText="…" actions={<Button label="Buy" />} />`, or composed: `Card.Root` around
 *  `Card.ActionArea` and the sections (`padded={false}`). */
export const Card = Object.assign(withEngine(CardImpl, "Card"), {
  Root: withEngine(Root, "Card.Root"),
  ActionArea,
  Media,
  Header,
  Avatar,
  HeaderText,
  Headline,
  Subhead,
  HeaderAction,
  Content,
  SupportingText,
  Actions,
  Footer,
});
