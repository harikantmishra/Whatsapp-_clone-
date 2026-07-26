import useThemeStore from "../store/themeStore.js";
import useLoginStore from "../store/useLoginStore.js";


  

const ProgressBar = () => {
  const { theme} = useThemeStore();
  const {step}  = useLoginStore();

  return (
    <div
      className={`w-full ${
        theme === "dark" ? "bg-gray-700" : "bg-gray-200"
      } rounded-full h-2.5 mb-6`}
    >
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
        style={{
          width: `${(step / 3) * 100}%`,
        }}
      />
    </div>
  );
};
 export default ProgressBar;