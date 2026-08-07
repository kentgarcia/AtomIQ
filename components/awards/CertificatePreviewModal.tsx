import { LinearGradient } from "expo-linear-gradient";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import {TabLight as LightTHEME, fontFamilies} from "@/theme";

const createCertificatePreviewStyles = (
  theme: typeof LightTHEME,
  width: number,
) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContainer: {
      width: "100%",
      alignItems: "center",
    },
    certificatePreview: {
      width: width - 40,
      height: (width - 40) * 1.414,
      borderRadius: 4,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 20,
    },
    certificatePaper: {
      flex: 1,
      backgroundColor: "#FFFEF8",
      padding: 12,
    },
    certificateOuterBorder: {
      flex: 1,
      borderWidth: 2,
      padding: 6,
    },
    certificateInnerBorder: {
      flex: 1,
      borderWidth: 1,
      borderStyle: "dashed",
    },
    previewCertificateContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 24,
      paddingHorizontal: 20,
    },
    certHeaderSection: {
      alignItems: "center",
      marginBottom: 24,
    },
    certHeaderText: {
      fontSize: 36,
      fontWeight: "300",
      fontFamily: fontFamilies.light,
      letterSpacing: 8,
    },
    certOfText: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: "#666",
      fontStyle: "italic",
      marginVertical: 4,
    },
    certAchievementText: {
      fontSize: 20,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      letterSpacing: 6,
    },
    decorativeLine: {
      width: 100,
      height: 2,
      marginVertical: 20,
    },
    certBodySection: {
      alignItems: "center",
      width: "100%",
    },
    certPresentedTo: {
      fontSize: 12,
      fontFamily: fontFamilies.regular,
      color: "#666",
      fontStyle: "italic",
      marginBottom: 12,
    },
    certRecipientName: {
      fontSize: 32,
      fontWeight: "600",
      fontFamily: fontFamilies.semibold,
      color: "#1a1a1a",
      marginBottom: 16,
      textAlign: "center",
    },
    certCompletionText: {
      fontSize: 12,
      fontFamily: fontFamilies.regular,
      color: "#666",
      fontStyle: "italic",
      marginBottom: 16,
    },
    courseTitle: {
      fontSize: 22,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
      textAlign: "center",
      marginBottom: 8,
    },
    courseDescription: {
      fontSize: 14,
      fontFamily: fontFamilies.regular,
      color: "#555",
      textAlign: "center",
      fontStyle: "italic",
      paddingHorizontal: 20,
    },
    certFooterSection: {
      alignItems: "center",
      marginTop: 24,
    },
    issueDateText: {
      fontSize: 11,
      fontFamily: fontFamilies.regular,
      color: "#888",
      marginBottom: 12,
    },
    issuerName: {
      fontSize: 20,
      fontWeight: "800",
      fontFamily: fontFamilies.heavy,
      letterSpacing: 4,
    },
    issuerTagline: {
      fontSize: 10,
      fontFamily: fontFamilies.regular,
      color: "#888",
      letterSpacing: 1,
      marginTop: 4,
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 16,
      marginTop: 24,
    },
    actionButton: {
      borderRadius: 12,
      overflow: "hidden",
      minWidth: 130,
    },
    closeButtonNew: {
      backgroundColor: "#FFF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 32,
    },
    closeButtonText: {
      color: "#333",
      fontSize: 16,
      fontWeight: "700",
      fontFamily: fontFamilies.bold,
    },
  });

export const CertificatePreviewModal = ({
  visible,
  certificate,
  onClose,
  theme,
  width,
  username,
}: {
  visible: boolean;
  certificate: any;
  onClose: () => void;
  theme: typeof LightTHEME;
  width: number;
  username?: string;
}) => {
  const styles = createCertificatePreviewStyles(theme, width);
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {certificate && (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.modalContainer}
          >
            {/* Clean Professional Certificate */}
            <View style={styles.certificatePreview}>
              <View style={styles.certificatePaper}>
                {/* Decorative Border */}
                <View
                  style={[
                    styles.certificateOuterBorder,
                    { borderColor: certificate.gradient[0] },
                  ]}
                >
                  <View
                    style={[
                      styles.certificateInnerBorder,
                      { borderColor: certificate.gradient[0] + "50" },
                    ]}
                  >
                    {/* Certificate Content */}
                    <View style={styles.previewCertificateContent}>
                      {/* Header */}
                      <View style={styles.certHeaderSection}>
                        <Text
                          style={[
                            styles.certHeaderText,
                            { color: certificate.gradient[0] },
                          ]}
                        >
                          CERTIFICATE
                        </Text>
                        <Text style={styles.certOfText}>of</Text>
                        <Text
                          style={[
                            styles.certAchievementText,
                            { color: certificate.gradient[1] },
                          ]}
                        >
                          ACHIEVEMENT
                        </Text>
                      </View>

                      {/* Decorative Line */}
                      <LinearGradient
                        colors={certificate.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.decorativeLine}
                      />

                      {/* Body */}
                      <View style={styles.certBodySection}>
                        <Text style={styles.certPresentedTo}>
                          This is to certify that
                        </Text>

                        <Text style={styles.certRecipientName}>
                          {(username || "").trim() || "Scientist"}
                        </Text>

                        <Text style={styles.certCompletionText}>
                          has successfully completed the course
                        </Text>

                        <Text
                          style={[
                            styles.courseTitle,
                            { color: certificate.gradient[0] },
                          ]}
                        >
                          {certificate.title}
                        </Text>

                        <Text style={styles.courseDescription}>
                          {certificate.description}
                        </Text>
                      </View>

                      {/* Decorative Line */}
                      <LinearGradient
                        colors={certificate.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.decorativeLine}
                      />

                      {/* Footer */}
                      <View style={styles.certFooterSection}>
                        <Text style={styles.issueDateText}>
                          Issued on{" "}
                          {new Date().toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                        <Text
                          style={[
                            styles.issuerName,
                            { color: certificate.gradient[0] },
                          ]}
                        >
                          AtomIQ
                        </Text>
                        <Text style={styles.issuerTagline}>
                          Nuclear Science Education Platform
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.closeButtonNew]}
                onPress={onClose}
              >
                <Icon
                  name="CloseCircle"
                  size={20}
                  color="#333"
                  variant="Bold"
                />
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};