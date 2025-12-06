export const Privacy = ({ className = "" }) => {
  return (
    <div
      className={`container max-h-[70vh] ${className} overflow-scroll overflow-x-hidden text-sm pr-8 scrollbar-thumb-rounded-full scrollbar-track-black`}
    >
      <div className="flex flex-col gap-2">
        <div className="font-black text-xl">Introduction</div>
        <div>
          This Privacy Policy explains how Australia Pacific Airports
          (Melbourne) Pty Ltd ACN 076 999 114 ('we/us/our/Melbourne Airport')
          manages your personal information.
        </div>{" "}
        <div>
          We are bound by the Australian Privacy Principles of the Privacy Act
          1988 (Cth) (Privacy Act) in our handling of personal information we
          collect about you. We may tell you more about how we handle your
          information at the time we collect it.
        </div>
        <div className="font-black text-xl pt-4">
          What is personal information?
        </div>
        <div>
          Personal information is information or an opinion about an identified
          individual, or an individual who is reasonably identifiable from the
          information or opinion.
        </div>
        <div className="font-black text-xl pt-4">
          Collecting your information
        </div>
        <div>
          We may collect personal information about you when you contact us,
          visit Melbourne Airport or when you request or use a product or
          service (for example, the WiFi service or our online parking booking
          service).
        </div>
        <div>
          {" "}
          The information we collect may include your name, age, gender and
          contact details (for example, your home or business address and email
          address) and location data whilst within Melbourne Airport. If you
          visit the airport terminal, we may collect CCTV images of you from our
          closed circuit cameras. Our security personnel are equipped with
          audio-visual recording devices and may record your contact with them
          for quality, safety and security purposes. You will be notified orally
          and in writing before your contact is recorded. If you login to the
          WiFi service we provide, we may collect any MAC address associated
          with your wireless device. We may also collect information about your
          interactions with us or the shops in the airport terminal.
        </div>
        <div>
          Collection of your information may be required by the Civil Aviation
          Act 1988 and the Civil Aviation Regulations 1988.
        </div>
        <div>
          If you do not provide some or all of the information we request, we
          may be unable to provide you with a product or service.
        </div>
        <div>
          If we receive unsolicited personal information about you (that is
          information we have not requested), and we determine that we could not
          have lawfully collected that information, we will destroy or
          de-identify the information if it is reasonable or lawful to do so.
        </div>
      </div>
    </div>
  );
};
