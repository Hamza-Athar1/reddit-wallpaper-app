import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";

export default function ImagePreviewModal({
  url,
  visible,
  onClose,
}: {
  url: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!url) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close preview"
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.imageTouchable}
          onPress={onClose}
        >
          <Image
            source={{ uri: url }}
            style={styles.image}
            contentFit="contain"
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageTouchable: {
    width: "90%",
    height: "80%",
    borderRadius: 16,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 48,
    right: 32,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 4,
  },
});
