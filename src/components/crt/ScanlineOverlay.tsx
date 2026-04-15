import LinearGradient from 'react-native-linear-gradient';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

/** Subtle horizontal scanlines: repeating dark stripes every ~4px (2px tint + 2px clear). */
function buildStripeColors(stripePx = 4, tintAlpha = 0.08): { colors: string[]; locations: number[] } {
  const stripeCount = Math.ceil(H / stripePx) + 2;
  const outColors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i < stripeCount; i++) {
    const t = i / (stripeCount - 1);
    const isDark = i % 2 === 0;
    outColors.push(isDark ? `rgba(0,0,0,${tintAlpha})` : 'transparent');
    locations.push(t);
  }
  return { colors: outColors, locations };
}

const stripe = buildStripeColors(4, 0.08);

export default function ScanlineOverlay() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient
        colors={stripe.colors}
        locations={stripe.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.gradient, { width: W, height: H }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  gradient: {
    opacity: 1,
  },
});
