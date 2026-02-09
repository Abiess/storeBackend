package storebackend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import storebackend.dto.CouponDTO;
import storebackend.entity.Coupon;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface CouponMapper {

    @Mapping(target = "type", source = "type", qualifiedByName = "enumToString")
    @Mapping(target = "status", source = "status", qualifiedByName = "enumToString")
    @Mapping(target = "appliesTo", source = "appliesTo", qualifiedByName = "enumToString")
    @Mapping(target = "domainScope", source = "domainScope", qualifiedByName = "enumToString")
    @Mapping(target = "combinable", source = "combinable", qualifiedByName = "enumToString")
    CouponDTO toDto(Coupon coupon);

    @Mapping(target = "type", source = "type", qualifiedByName = "stringToType")
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    @Mapping(target = "appliesTo", source = "appliesTo", qualifiedByName = "stringToAppliesTo")
    @Mapping(target = "domainScope", source = "domainScope", qualifiedByName = "stringToDomainScope")
    @Mapping(target = "combinable", source = "combinable", qualifiedByName = "stringToCombinable")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Coupon toEntity(CouponDTO dto);

    @Named("enumToString")
    default String enumToString(Enum<?> enumValue) {
        return enumValue != null ? enumValue.name() : null;
    }

    @Named("stringToType")
    default Coupon.CouponType stringToType(String value) {
        return value != null ? Coupon.CouponType.valueOf(value) : null;
    }

    @Named("stringToStatus")
    default Coupon.CouponStatus stringToStatus(String value) {
        return value != null ? Coupon.CouponStatus.valueOf(value) : null;
    }

    @Named("stringToAppliesTo")
    default Coupon.AppliesTo stringToAppliesTo(String value) {
        return value != null ? Coupon.AppliesTo.valueOf(value) : null;
    }

    @Named("stringToDomainScope")
    default Coupon.DomainScope stringToDomainScope(String value) {
        return value != null ? Coupon.DomainScope.valueOf(value) : null;
    }

    @Named("stringToCombinable")
    default Coupon.Combinable stringToCombinable(String value) {
        return value != null ? Coupon.Combinable.valueOf(value) : null;
    }
}

