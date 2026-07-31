import InfoCard from "../InfoCard";

export default function CompanyOverview({
  company,
}: any) {

  return (

    <div className="grid grid-cols-4 gap-4">

      <InfoCard
        title="Company"
        value={company?.name}
      />

      <InfoCard
        title="Country"
        value={company?.country}
      />

      <InfoCard
        title="City"
        value={company?.city}
      />

      <InfoCard
        title="Status"
        value={company?.status}
      />

    </div>

  );

}