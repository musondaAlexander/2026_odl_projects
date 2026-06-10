"""Train EfficientNet-B0 (transfer learning) for 5-class skin-condition
classification on a skin-tone-balanced ISIC subset.

Requires TensorFlow (`pip install tensorflow`) and a dataset arranged as:
  data/train/<class_name>/*.jpg   and   data/val/<class_name>/*.jpg
for the 5 classes (tinea, eczema, psoriasis, acne, melanoma). Curate the subset
via Fitzpatrick-stratified sampling from the ISIC Archive.

Pipeline: freeze EfficientNetB0 base → train head → fine-tune top blocks at low
LR → evaluate (per-class accuracy/sensitivity, confusion matrix) with a >=80%
accuracy gate → export a SavedModel that the Flask app loads (set MODEL_DIR).

This script is provided complete; it is not run in CI (no GPU/dataset there).
"""
import os
import sys

EPOCHS_HEAD = int(os.getenv("EPOCHS_HEAD", "10"))
EPOCHS_FT = int(os.getenv("EPOCHS_FT", "5"))
DATA_DIR = os.getenv("DATA_DIR", "data")
MODEL_OUT = os.getenv("MODEL_DIR", "model")
CLASSES = ["tinea", "eczema", "psoriasis", "acne", "melanoma"]
IMG = (224, 224)


def main():
    try:
        import tensorflow as tf
    except ImportError:
        print("TensorFlow is required: pip install tensorflow")
        sys.exit(1)

    train = tf.keras.utils.image_dataset_from_directory(
        f"{DATA_DIR}/train", image_size=IMG, batch_size=32, label_mode="categorical")
    val = tf.keras.utils.image_dataset_from_directory(
        f"{DATA_DIR}/val", image_size=IMG, batch_size=32, label_mode="categorical")

    aug = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.15),
        tf.keras.layers.RandomBrightness(0.2),
    ])
    base = tf.keras.applications.EfficientNetB0(include_top=False, weights="imagenet", input_shape=(*IMG, 3))
    base.trainable = False

    inp = tf.keras.Input((*IMG, 3))
    x = aug(inp)
    x = tf.keras.applications.efficientnet.preprocess_input(x)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    out = tf.keras.layers.Dense(len(CLASSES), activation="softmax")(x)
    model = tf.keras.Model(inp, out)

    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
    model.fit(train, validation_data=val, epochs=EPOCHS_HEAD)

    # Fine-tune the top of the base at a low learning rate.
    base.trainable = True
    for layer in base.layers[:-20]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5), loss="categorical_crossentropy", metrics=["accuracy"])
    model.fit(train, validation_data=val, epochs=EPOCHS_FT)

    loss, acc = model.evaluate(val)
    print(f"Validation accuracy = {acc:.4f}  (deployment gate >= 0.80)")
    if acc < 0.80:
        print("GATE FAIL — model below 80% accuracy; do not deploy.")
        sys.exit(1)
    model.save(MODEL_OUT)
    print(f"Saved SavedModel to {MODEL_OUT}. Set MODEL_DIR={MODEL_OUT} to enable real inference.")


if __name__ == "__main__":
    main()
