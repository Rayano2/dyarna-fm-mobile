import { Text, type TextProps, type TextStyle, type StyleProp } from 'react-native';

// U+20C1 SAUDI RIYAL SIGN (Unicode 17, 2025). Only the bundled
// `saudi_riyal` / `saudi_riyal_bold` fonts contain this glyph in the
// app — the rest of our type stack (Inter, Tajawal, …) doesn't ship it
// yet and the OS fallback can't be relied on across older devices.
const RIYAL_GLYPH = '\u{20C1}';

export interface RiyalSymbolProps extends Omit<TextProps, 'children'> {
  /** Render with the heavier weight cut of the riyal font when alongside
   *  bold price/cost text so the symbol's stroke matches its neighbour. */
  bold?: boolean;
}

export function RiyalSymbol({ bold = false, style, ...rest }: RiyalSymbolProps) {
  const fontStyle: StyleProp<TextStyle> = {
    fontFamily: bold ? 'saudi_riyal_bold' : 'saudi_riyal',
  };
  return (
    <Text {...rest} style={[fontStyle, style]}>
      {RIYAL_GLYPH}
    </Text>
  );
}
