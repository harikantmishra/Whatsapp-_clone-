import React from "react";
import { motion } from "framer-motion";
import { FaSpinner } from "react-icons/fa";

function Spinner({
  size = "medium",
  color = "light",
  text = false,
}) {
  const sizeClasses = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-3xl",
  };

  const colorClasses = {
    light: "text-white",
    dark: "text-gray-800",
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          duration: 0.8,
          ease: "linear",
        }}
        className={`${sizeClasses[size] || sizeClasses.medium} ${
          colorClasses[color] || colorClasses.light
        }`}
      >
        <FaSpinner aria-label="Loading" />
      </motion.div>

      {text && (
        <span
          className={`text-sm font-medium ${
            colorClasses[color] || colorClasses.light
          }`}
        >
          Loading...
        </span>
      )}
    </div>
  );
}

export default Spinner;