import { LinearGradient } from "expo-linear-gradient";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import {TabLight as LightTHEME, fontFamilies} from "@/theme";

const createCertificateStyles = (theme: typeof LightTHEME) =>
  StyleSheet.create({
    certificateWrapper: {},
    certificate: {
      height: 170,
      borderRadius: 24,
      overflow: "hidden",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      backgroundColor: theme.card,
    },
    certificateGradient: {
      flex: 1,
      position: "relative",
    },
    certificateLocked: {
      backgroundColor: theme.bg,
      borderWidth: 1,
      borderColor: theme.border,
    },
    certificateContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: 20,
      zIndex: 10,
    },
    certificateLeft: {
      marginRight: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    certificateRight: {
      flex: 1,
      justifyContent: "center",
      alignItems: "flex-start",
      minWidth: 0,
    },
    certificateIconBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    certificateLabel: {
      fontSize: 10,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "rgba(255,255,255,0.8)",
      letterSpacing: 1,
      marginBottom: 4,
    },
    certificateTitle: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      color: "#FFFFFF",
      marginBottom: 12,
      lineHeight: 22,
      flexShrink: 1,
      width: "100%",
    },
    certificateButton: {
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    certificateButtonText: {
      fontSize: 12,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
    },
    certDecoration1: {
      position: "absolute",
      top: -20,
      right: -20,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    certDecoration2: {
      position: "absolute",
      bottom: -30,
      left: 40,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.05)",
    },
    certificateLockedContent: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      padding: 20,
    },
    certificateIconBadgeLocked: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    certificateTitleLocked: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      marginBottom: 4,
      color: theme.text,
      flexShrink: 1,
      width: "100%",
    },
    certificateDescLocked: {
      fontSize: 13,
      color: theme.textMuted,
      fontWeight: "500",
      fontFamily: fontFamilies.medium,
      flexShrink: 1,
      width: "100%",
    },
  });

export const CertificateCard = ({
  cert,
  index,
  width,
  onPress,
  theme,
}: {
  cert: any;
  index: number;
  width: number;
  onPress: () => void;
  theme: typeof LightTHEME;
}) => {
  const styles = createCertificateStyles(theme);
  return (
    <TouchableOpacity
      activeOpacity={cert.unlocked ? 0.7 : 1}
      onPress={onPress}
      style={[styles.certificateWrapper, { width }]}
    >
      <Animated.View
        entering={FadeInDown.delay(250 + index * 50).springify()}
        style={[
          styles.certificate,
          !cert.unlocked && styles.certificateLocked,
        ]}
      >
        {cert.unlocked ? (
          <LinearGradient
            colors={cert.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.certificateGradient}
          >
            <View style={styles.certDecoration1} />
            <View style={styles.certDecoration2} />

            <View style={styles.certificateContent}>
              <View style={styles.certificateLeft}>
                <View style={styles.certificateIconBadge}>
                  <Icon
                    name="Award"
                    size={28}
                    color={cert.gradient[1]}
                    variant="Bold"
                  />
                </View>
              </View>
              <View style={styles.certificateRight}>
                <Text style={styles.certificateLabel}>CERTIFICATE</Text>
                <Text style={styles.certificateTitle} numberOfLines={2}>
                  {cert.title}
                </Text>
                <View style={styles.certificateButton}>
                  <Text
                    style={[
                      styles.certificateButtonText,
                      { color: cert.gradient[1] },
                    ]}
                  >
                    VIEW
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.certificateLockedContent}>
            <View style={styles.certificateIconBadgeLocked}>
              <Icon
                name="Lock1"
                size={24}
                color={theme.textMuted}
                variant="Bold"
              />
            </View>
            <View style={styles.certificateRight}>
              <Text style={styles.certificateTitleLocked}>{cert.title}</Text>
              <Text style={styles.certificateDescLocked}>
                Complete requirements to unlock
              </Text>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};