package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.ReviewVote;

import java.util.Optional;

@Repository
public interface ReviewVoteRepository extends JpaRepository<ReviewVote, Long> {

    // Check if user already voted on this review
    boolean existsByReviewIdAndUserId(Long reviewId, Long userId);

    Optional<ReviewVote> findByReviewIdAndUserId(Long reviewId, Long userId);

    // Count votes
    Integer countByReviewIdAndIsHelpfulTrue(Long reviewId);

    Integer countByReviewIdAndIsHelpfulFalse(Long reviewId);
}

