import InfoCard from "../InfoCard";

export default function InquiryOverview({
  inquiry,
}: any) {

  return (

    <div className="grid grid-cols-4 gap-4">

      <InfoCard
        title="Inquiry"
        value={inquiry?.inquiry_no}
      />

      <InfoCard
        title="Company"
        value={inquiry?.companies?.name}
      />

      <InfoCard
        title="Status"
        value={inquiry?.status}
      />

      <InfoCard
        title="Date"
        value={inquiry?.created_at}
      />

    </div>

  );

}