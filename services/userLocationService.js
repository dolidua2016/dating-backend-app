async function handleLocationUpdate(findUser, queryParam) {
  if (!queryParam?.country) return findUser.countryId;

  const country = await countriesRepo.findOne({
    countryName: { $regex: queryParam.country, $options: "i" },
    isActived: 1
  });

  const updateData = {
    countryId: country?._id || null,
    city: queryParam.city,
    state: queryParam.state,
    address: queryParam.address,
    location: queryParam.lat && queryParam.long
      ? { type: "Point", coordinates: [+queryParam.long, +queryParam.lat] }
      : {}
  };

  await userRepo.update({ _id: findUser._id }, updateData);
  return country?._id || null;
}
