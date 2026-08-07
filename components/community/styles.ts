import { StyleSheet } from "react-native";

import { TabLight as LightTHEME } from "@/theme";

export const createStyles = (theme: typeof LightTHEME) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    // Header
    header: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: theme.card,
    },
    headerContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTextContainer: {
      flex: 1,
      paddingRight: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 4,
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      fontWeight: "500",
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      backgroundColor: theme.bg,
    },
    savedBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      backgroundColor: "#5E72E4",
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
    savedBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },

    // Search
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      gap: 12,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      backgroundColor: theme.card,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },

    // Feed
    feedContent: {
      paddingBottom: 100,
    },
    feedSeparator: {
      height: 8,
      backgroundColor: "transparent",
    },
    postCard: {
      paddingVertical: 16,
      backgroundColor: theme.card,
    },
    postHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    authorAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#6A82FB",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    authorInfo: {
      flex: 1,
    },
    authorNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    authorName: {
      fontSize: 16,
      fontWeight: "700",
    },
    dotSeparator: {
      marginHorizontal: 4,
      color: "#999",
      fontSize: 12,
    },
    sourceLabel: {
      fontSize: 13,
      color: "#6A82FB",
      fontWeight: "700",
    },
    postMeta: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    timeAgo: {
      fontSize: 13,
      color: "#999",
      fontWeight: "500",
    },
    categoryLabel: {
      fontSize: 13,
      color: "#999",
      fontWeight: "500",
    },
    readTimeLabel: {
      fontSize: 13,
      color: "#999",
      fontWeight: "500",
    },
    moreButtonContainer: {
      position: "relative",
      zIndex: 100,
    },
    moreButton: {
      padding: 8,
      marginRight: -8,
    },
    moreMenuDropdown: {
      position: "absolute",
      top: 35,
      right: 0,
      borderRadius: 16,
      paddingVertical: 8,
      minWidth: 180,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      zIndex: 1000,
    },
    moreMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    moreMenuItemDanger: {
      // danger styling handled by text color
    },
    moreMenuText: {
      fontSize: 15,
      fontWeight: "600",
    },
    moreMenuTextDanger: {
      color: "#E53935",
    },
    moreMenuTextDisabled: {
      color: "#999",
    },
    moreMenuDivider: {
      height: 1,
      backgroundColor: "#EEE",
      marginVertical: 4,
      marginHorizontal: 16,
    },
    postTitle: {
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    postContent: {
      fontSize: 16,
      lineHeight: 24,
      paddingHorizontal: 20,
    },
    seeMore: {
      fontSize: 15,
      color: "#999",
      fontWeight: "700",
      paddingHorizontal: 20,
      marginTop: 4,
      marginBottom: 8,
    },
    postImage: {
      width: "100%",
      height: 250,
      backgroundColor: "#EEE",
      marginTop: 12,
      marginBottom: 8,
    },
    readMoreLink: {
      fontSize: 15,
      color: "#6A82FB",
      fontWeight: "700",
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 8,
    },
    engagementStats: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      minHeight: 8,
    },
    reactionIndicator: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    reactionEmoji: {
      fontSize: 16,
    },
    reactionLabel: {
      fontSize: 14,
      fontWeight: "600",
    },
    divider: {
      height: 1,
      backgroundColor: "#EEE",
      marginHorizontal: 20,
    },
    actionRow: {
      flexDirection: "row",
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      gap: 6,
      position: "relative",
    },
    actionText: {
      fontSize: 14,
      fontWeight: "700",
    },
    commentBadge: {
      backgroundColor: "#6A82FB",
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      marginLeft: 2,
    },
    commentBadgeText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },

    // Reaction Button
    reactionContainer: {
      flex: 1,
      position: "relative",
    },
    reactionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      gap: 6,
    },
    picker: {
      position: "absolute",
      bottom: "100%",
      left: 0,
      flexDirection: "row",
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginBottom: 8,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      gap: 2,
    },
    reactionOption: {
      padding: 6,
    },
    buttonEmoji: {
      fontSize: 18,
    },
    buttonText: {
      fontSize: 13,
      fontWeight: "700",
    },

    // Empty State
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
    },
    emptyMascot: {
      width: 120,
      height: 120,
      opacity: 0.8,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "700",
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 15,
      color: "#999",
      marginTop: 4,
      fontWeight: "500",
    },

    // Undo Snackbar
    undoSnackbar: {
      position: "absolute",
      left: 16,
      right: 16,
      backgroundColor: "#323232",
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    undoSnackbarContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    undoSnackbarText: {
      fontSize: 15,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    undoButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    undoButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#6A82FB",
      letterSpacing: 0.5,
    },

    // Modals
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#EEE",
    },
    closeButton: {
      padding: 4,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    postPreview: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#EEE",
    },
    postPreviewText: {
      fontSize: 14,
      color: "#999",
      fontWeight: "600",
    },
    commentsList: {
      padding: 16,
      flexGrow: 1,
    },
    emptyComments: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    loadingMascot: {
      width: 80,
      height: 80,
      resizeMode: "contain",
      marginBottom: 12,
    },
    commentItem: {
      flexDirection: "row",
      marginBottom: 16,
    },
    commentAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#6A82FB",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    commentAvatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
      overflow: "hidden",
      backgroundColor: "rgba(94, 114, 228, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    mascotAvatar: {
      width: 40,
      height: 40,
      resizeMode: "contain",
    },
    commentContent: {
      flex: 1,
    },
    commentBubble: {
      padding: 12,
      borderRadius: 16,
      borderTopLeftRadius: 4,
    },
    commentAuthor: {
      fontSize: 14,
      fontWeight: "700",
      marginBottom: 2,
    },
    commentHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    factCheckBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 159, 101, 0.1)",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
    },
    factCheckText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#FF9F65",
      textTransform: "uppercase",
    },
    hiddenCommentHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    hiddenCommentTitle: {
      fontSize: 13,
      fontWeight: "700",
    },
    hiddenCommentReason: {
      fontSize: 13,
      lineHeight: 18,
      fontStyle: "italic",
    },
    aiNotice: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: "rgba(94, 114, 228, 0.2)",
    },
    aiNoticeText: {
      fontSize: 11,
      color: "#5E72E4",
      fontWeight: "600",
      fontStyle: "italic",
    },
    moderatingIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 8,
    },
    moderatingMascot: {
      width: 24,
      height: 24,
      resizeMode: "contain",
    },
    moderatingText: {
      fontSize: 13,
      color: "#5E72E4",
      fontWeight: "600",
    },
    cooldownIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 8,
      backgroundColor: "#FFF5ED",
      borderRadius: 8,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    cooldownText: {
      fontSize: 13,
      color: "#FF9F65",
      fontWeight: "600",
    },
    commentText: {
      fontSize: 15,
      lineHeight: 20,
    },
    commentTime: {
      fontSize: 12,
      color: "#999",
      marginTop: 4,
      marginLeft: 4,
      fontWeight: "600",
    },
    inputContainer: {
      borderTopWidth: 1,
      borderTopColor: "#EEE",
      padding: 12,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "flex-end",
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      maxHeight: 100,
      paddingTop: 8,
      paddingBottom: 8,
      fontWeight: "500",
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#6A82FB",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
      marginBottom: 2,
    },
    sendButtonDisabled: {
      backgroundColor: "#EEE",
    },

    // Saved List
    list: {
      padding: 16,
      flexGrow: 1,
    },
    savedItem: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    thumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: "#EEE",
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 4,
    },
    itemMeta: {
      fontSize: 13,
      color: "#999",
    },
    removeButton: {
      padding: 8,
    },

    // Report Modal
    descriptionContainer: {
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 32,
    },
    description: {
      fontSize: 15,
      color: "#999",
      textAlign: "center",
      marginTop: 12,
      lineHeight: 22,
    },
    reasonsList: {
      flex: 1,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: "#999",
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    reasonItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginBottom: 12,
      gap: 12,
    },
    reasonItemSelected: {
      backgroundColor: "rgba(255, 107, 107, 0.1)",
      borderWidth: 1,
      borderColor: "#FF6B6B",
    },
    reasonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "500",
    },
    reasonTextSelected: {
      color: "#FF6B6B",
    },
    radioButton: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: "#DDD",
      alignItems: "center",
      justifyContent: "center",
    },
    radioButtonSelected: {
      borderColor: "#FF6B6B",
    },
    radioButtonInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#FF6B6B",
    },
    additionalLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
    },
    additionalInput: {
      borderRadius: 12,
      padding: 16,
      fontSize: 15,
      minHeight: 100,
      borderWidth: 1,
      borderColor: "#EEE",
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: "#EEE",
    },
    submitButton: {
      backgroundColor: "#E53935",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
    },
    submitButtonDisabled: {
      backgroundColor: "#EEE",
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    submitButtonTextDisabled: {
      color: "#999",
    },

    // Feed Footer
    feedFooter: {
      paddingVertical: 40,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    footerContent: {
      alignItems: "center",
      maxWidth: 300,
    },
    footerTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    footerSubtext: {
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },

    // Comment Guidelines Modal
    guidelinesOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    guidelinesModal: {
      width: "100%",
      maxWidth: 400,
      borderRadius: 24,
      padding: 24,
      maxHeight: "80%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    guidelinesHeader: {
      alignItems: "center",
      marginBottom: 20,
    },
    guidelinesTitle: {
      fontSize: 22,
      fontWeight: "700",
      marginTop: 12,
      textAlign: "center",
    },
    guidelinesContent: {
      maxHeight: 300,
    },
    guidelineItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 16,
      paddingRight: 8,
    },
    guidelineEmoji: {
      fontSize: 24,
      marginRight: 12,
      marginTop: 2,
    },
    guidelineText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
    },
    guidelineBold: {
      fontWeight: "700",
    },
    guidelinesButton: {
      backgroundColor: "#5E72E4",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 20,
    },
    guidelinesButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
    },
  });
