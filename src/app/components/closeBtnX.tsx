export const CloseBtnX = ({ className = "" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
    >
      <g filter="url(#filter0_i_1_380)">
        <path
          d="M0 17.6562L4.344 22.0002L4.56066 21.7848L11.1229 15.2527L17.6561 21.7848L22.0001 17.4395L15.4681 10.8773L21.7848 4.56066L22.0002 4.344L17.6562 0L17.4396 0.21545L11.1229 6.5321L4.56069 6.78805e-05L0.21545 4.34407L6.74748 10.8773L0.21545 17.4396L0 17.6562Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <filter
          id="filter0_i_1_380"
          x="0"
          y="0"
          width="22.6618"
          height="22.6615"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="0.661518" dy="0.661518" />
          <feGaussianBlur stdDeviation="0.472513" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
          />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect1_innerShadow_1_380"
          />
        </filter>
      </defs>
    </svg>
  );
};
